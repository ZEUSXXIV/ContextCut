# Architecture & System Design Specification

This document details the software architecture, component layers, data structures, and lifecycle workflows powering the **Omni MCP Gateway**.

---

## 🏗️ Software Architecture Blueprint

Omni MCP Gateway acts as a secure, intermediate proxy translating incoming JSON-RPC 2.0 Model Context Protocol requests into compliant REST requests, and pruning the resulting REST responses into optimal LLM context windows before streaming them back.

```
                  +-----------------------------------+
                  |      LLM Client (e.g. Claude)     |
                  +-----------------+-----------------+
                                    |
                JSON-RPC / SSE      |   Authorization: Bearer omni_gt_...
                                    v
                  +-----------------+-----------------+
                  |         Omni MCP Gateway          |
                  +-----------------+-----------------+
                                    |
                                    +---> API Key / Signed Cookie Middleware
                                    |     (Authentication & Authorization)
                                    |
                                    +---> OpenAPI Spec Flat Parser Engine
                                    |     (MCP Schema generator)
                                    |
                                    +---> AES-256-GCM Decryption Vault
                                    |     (Credential extraction)
                                    |
                                    +---> Token-Saver Pruning Engine
                                    |     (Recursive payload compression)
                                    v
                  +-----------------+-----------------+
                  |      Third-Party REST Origin      |
                  +-----------------------------------+
```

---

## 📡 Dynamic Lifecycle Workflows

### 1. Connection Initialization & Handshake

To run tool executions, the LLM client initializes a Server-Sent Events (SSE) session with the gateway:

1. The LLM Client issues a `GET /api/mcp/sse?apiKey=omni_gt_...` handshake query.
2. The Gateway authenticates the API key, spawns a unique `sessionId`, locks a persistent write connection channel, and fires an initial `endpoint` SSE mapping announcement back to the client.
3. Subsequent tool execution payloads are sent statelessly via standard `POST /api/mcp/message?sessionId=...` requests, which are processed inside the active gateway session container.

### 2. Request / Response Proxy Cycle

```
[LLM Tool Request] -> (POST /api/mcp/message)
                           |
                           v
              [Identify Target SSE Session]
                           |
                           v
        [Decrypt Third-Party Credentials in Memory]
                           |
                           v
       [Verify Endpoint Permissions (Mutating Gate)]
                           |
                           v
            [Forward to Third-Party REST API]
                           |
                           v
             [Receive Raw JSON Payload]
                           |
                           v
         [Execute Recursive Token-Saver Pruning]
                           |
                           v
         [Stream Compressed JSON-RPC 2.0 to LLM]
```

### 3. W3C Distributed Tracing & Traceparent Propagation
Omni MCP Gateway fully supports W3C Trace Context propagation inside its Express proxy layers. On every tool call execution request:
* A unique W3C `traceparent` (e.g. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) is generated or propagated downstream in outgoing Axios requests.
* Trace identifiers (`traceId`, `spanId`) are correlated with the active database session and user tenant profiles.
* Comprehensive model/client metadata—such as the AI model name (`modelName`), client orchestrator program name (`clientName`), and active user prompt (`prompt`)—are parsed from incoming JSON-RPC handshakes/messages and saved directly into the tracing telemetry.

### 4. Gateway-Level Tool Isolation & SSE Filtering
To ensure strict multi-tenant isolation and granular tool scopes:
* The gateway supports isolation queries (`&gatewayId=...`) on the SSE endpoint (`/api/mcp/sse`) and JSON-RPC message broker (`/api/mcp/message`).
* When specified, the SSE connection dynamically restricts the `tools/list` response to expose ONLY the tools associated with that specific gateway ID, instead of exposing all registered APIs for the tenant.
* Message routing validates ownership of the requested `gatewayId` before permitting the execution of downstream tool calls.

---

## 🗄️ Database Models (Mongoose)

The backend utilizes MongoDB to persist multi-tenant gateways and secure credential mappings:

```
                      +-------------------+
                      |       User        |
                      +---------+---------+
                                | 1
                                |
                                | 1..*
                      +---------v---------+
                      |   ConnectedAPI    |
                      +---------+---------+
                                | 1
                                |
                                | 1
                      +---------v---------+
                      |  EncryptedSecret  |
                      +-------------------+
```

### 1. User Collection
Stores tenant registration profiles, verification locks, and generated scrypt OTP credentials:
```typescript
{
  email: String,          // Unique, lowercased, trimmed index
  passwordHash: String,   // Salted scrypt buffer hash
  apiKey: String,         // Generated omni_gt_... API Key
  isVerified: Boolean,    // OTP verification check
  otpHash: String,        // Salted scrypt hash of current numeric OTP
  otpExpiresAt: Date,     // 5-minute expiry window
  timestamps: true
}
```

### 2. ConnectedAPI Collection
Stores parsed OpenAPI specifications and custom security toggles for hosted endpoints:
```typescript
{
  user: ObjectId,          // References the User Collection
  name: String,            // User-friendly connection label
  specUrl: String,         // Public OpenAPI raw URL
  rawSpec: Object,         // Complete stored JSON specification
  allowedPaths: [{         // Selection parameters
    path: String,
    method: String,
    isEnabled: Boolean,
    isWritable: Boolean,   // Controls mutation capability
    enableToon: Boolean,   // Path-level TOON toggle
    customDescription: String, // Path-level description override
    customHeaders: Object  // Path-specific header overrides (Mixed)
  }],
  tokenSaverConfig: {
    maxDepth: Number,      // Recursion limit (default 10)
    maxArrayLength: Number,// Array item limit (default 50)
    maxCharCap: Number,    // Hard size limit (default 50,000)
    stripMetadataKeys: [String]
  },
  customHeaders: Object,   // Global connection-level header mapping (Mixed)
  enableToonCompression: Boolean, // Connection-level TOON toggle
  timestamps: true
}
```

### 3. EncryptedSecret Collection
Isolated credentials store to ensure third-party passwords/keys are vaulted securely:
```typescript
{
  apiId: ObjectId,         // References the ConnectedAPI Collection
  credentialKeyName: String, // e.g. "Authorization" or "x-api-key"
  encryptedData: String,   // AES-256-GCM cipher hex
  iv: String,              // 12-byte initialization vector hex
  tag: String,             // 16-byte authentication tag hex
  timestamps: true
}
```

### 4. Session Collection
Maintains stateful browser login sessions for the Next.js frontend:
```typescript
{
  userId: ObjectId,       // References the User Collection
  sessionToken: String,   // Cryptographically secure random 32-byte token hex
  expiresAt: Date,        // Expiration (Time-To-Live index automated)
  userAgent: String,
  ipAddress: String,
  timestamps: true
}
```

### 5. RequestTrace Collection
Stores low-overhead distributed request traces, latency indicators, and payload telemetry with a sliding 7-day TTL index retention policy:
```typescript
{
  traceId: String,          // W3C Trace ID (indexed)
  spanId: String,           // W3C Span ID
  user: ObjectId,           // References the User Collection (indexed)
  connectedApi: ObjectId,   // References the ConnectedAPI Collection (indexed)
  toolName: String,         // Invoked JSON-RPC tool name
  method: String,           // HTTP Method
  path: String,             // Request URL Path
  arguments: Object,        // Decrypted JSON-RPC arguments (Mixed)
  proxyStart: Date,         // Incoming request timestamp (indexed)
  proxyEnd: Date,           // Outgoing completion timestamp
  originStart: Date,        // REST dispatch timestamp
  originEnd: Date,          // REST response timestamp
  originalResponseSizeBytes: Number, // Raw payload size
  optimizedResponseSizeBytes: Number,// Pruned size
  originStatus: Number,     // HTTP status code from downstream API
  status: String,           // 'SUCCESS' | 'API_ERROR' | 'GATEWAY_ERROR'
  errorMessage: String,     // Error diagnostics
  requestHeaders: Object,   // Redacted request headers (Mixed)
  requestBody: Object,      // Redacted request body (Mixed)
  requestQuery: Object,     // Redacted request query (Mixed)
  rawResponseBody: String,  // Raw downstream REST JSON string
  optimizedResponseBody: String, // Pruned JSON output string
  toonResponseBody: String, // Pruned TOON output string
  prompt: String,           // Developer system / user intent prompt
  modelName: String,        // Invoked AI Model Name (e.g. claude-3.5-sonnet)
  clientName: String,       // Client orchestrator name (e.g. Cursor, Claude Desktop)
  timestamps: true
}
```
