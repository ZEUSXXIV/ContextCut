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
    isWritable: Boolean   // Controls mutation capability
  }],
  tokenSaverConfig: {
    maxDepth: Number,
    maxArrayLength: Number,
    maxCharCap: Number,
    stripMetadataKeys: [String]
  },
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
