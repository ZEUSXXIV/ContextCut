# API & MCP Reference Handbook

This handbook describes all REST API routes and the custom Server-Sent Events (SSE) protocol implemented in the **Omni MCP Gateway**.

---

## 🔐 Tenant Authentication & Session Routes (`/api/auth`)

These endpoints manage user accounts, verification, and browser sessions. They leverage `cookie-parser` to handle cryptographically signed, secure `httpOnly` cookies.

### 1. Register Account
* **Route:** `POST /api/auth/signup`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "message": "Registration successful. An OTP has been generated.",
    "user": {
      "id": "664c39...",
      "email": "user@example.com",
      "isVerified": false
    },
    "otp": "673295"
  }
  ```
  *Note: The generated OTP is returned in the API response in development/sandbox mode for testing convenience and printed to the server terminal console.*

### 2. Verify OTP Registration
* **Route:** `POST /api/auth/verify-otp`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "otp": "673295"
  }
  ```
* **Success Response (200 OK):**
  Sets a cryptographically signed, secure `httpOnly` cookie named `session_token` with a 24-hour expiration lifetime.
  ```json
  {
    "message": "Email verified successfully.",
    "user": {
      "id": "664c39...",
      "email": "user@example.com",
      "isVerified": true,
      "apiKey": "omni_gt_73f82..."
    }
  }
  ```

### 3. Resend OTP Code
* **Route:** `POST /api/auth/resend-otp`
* **Request Body:**
  ```json
  { "email": "user@example.com" }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "A new OTP has been generated and printed to console.",
    "otp": "129845"
  }
  ```

### 4. User Session Login
* **Route:** `POST /api/auth/login`
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK):**
  Sets the signed cookie `session_token`.
  ```json
  {
    "message": "Login successful.",
    "user": {
      "id": "664c39...",
      "email": "user@example.com",
      "isVerified": true,
      "apiKey": "omni_gt_73f82..."
    }
  }
  ```
* **Error Response (403 Forbidden - Unverified Account):**
  Automatically regenerates and hashes a fresh 6-digit verification code, saving it in Mongoose and printing it directly to the server terminal console.
  ```json
  {
    "error": "Verification needed. Please verify your account using OTP before logging in.",
    "verified": false,
    "otpRequired": true,
    "otp": "675796"
  }
  ```

### 5. Retrieve Sanitized Session Profile
* **Route:** `GET /api/auth/me`
* **Headers:** Cookie: `session_token=...` (Or pass standard Authorization Bearer API Key).
* **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "664c39...",
      "email": "user@example.com",
      "isVerified": true,
      "apiKey": "omni_gt_73f82..."
    }
  }
  ```

### 6. User Logout
* **Route:** `POST /api/auth/logout`
* **Success Response (200 OK):**
  Deletes the session record from MongoDB and clears the browser's `session_token` cookie.
  ```json
  { "message": "Logout successful." }
  ```

---

## 🔌 API Gateway Management Routes (`/api/gateways` & `/api/apis`)

These endpoints manage hosted connection details. Authenticated session cookies or Bearer API keys are required for all endpoints.

### 1. Validate OpenAPI URL Specification
* **Route:** `POST /api/gateways/validate`
* **Request Body:**
  ```json
  { "url": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json" }
  ```
* **Success Response (200 OK):**
  Returns parsed API metadata and an array of detected HTTP endpoints.
  ```json
  {
    "title": "Stripe API",
    "paths": [
      { "path": "/v1/charges", "method": "get", "isEnabled": true, "isWritable": false },
      { "path": "/v1/charges", "method": "post", "isEnabled": true, "isWritable": true }
    ]
  }
  ```

### 2. Connect & Host New OpenAPI Gateway
* **Route:** `POST /api/gateways`
* **Request Body:**
  ```json
  {
    "name": "Stripe Payments Core",
    "openApiUrl": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
    "paths": [
      { "path": "/v1/charges", "method": "get", "isEnabled": true, "isWritable": false }
    ],
    "credentialKeyName": "Authorization",
    "credentialValue": "sk_test_51O..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Gateway connected successfully.",
    "gateway": {
      "_id": "api-12345",
      "name": "Stripe Payments Core",
      "openApiUrl": "https://raw.githubusercontent.com/stripe..."
    }
  }
  ```

### 3. List Hosted Connection Gateways
* **Route:** `GET /api/gateways`
* **Success Response (200 OK):**
  ```json
  [
    {
      "_id": "api-12345",
      "name": "Stripe Payments Core",
      "openApiUrl": "https://...",
      "totalRequests": 45,
      "averageCompressionRatio": 4.18
    }
  ]
  ```

### 4. Remove Hosted Gateway
* **Route:** `DELETE /api/gateways/:id`
* **Success Response (200 OK):**
  Deletes the specification, hosted path configs, and encrypted secrets from the database.
  ```json
  { "message": "Gateway connection deleted successfully." }
  ```

### 5. Trigger Traffic Simulation
* **Route:** `POST /api/gateways/:id/simulate`
* **Success Response (200 OK):**
  Executes a random endpoint lookup, generates an mock REST query payload, runs it through the Token-Saver, and appends the trace metric logs to the database tracker.
  ```json
  { "message": "Simulated request logged successfully." }
  ```

### 6. REST Proxy Forwarding Test-Request
* **Route:** `POST /api/gateways/:id/test-request`
* **Headers:** Cookie: `session_token=...` or Authorization Bearer API Key
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "path": "/v1/charges",
    "method": "get",
    "queryParams": {
      "limit": 10
    },
    "headers": {
      "x-custom-test-header": "test-value"
    },
    "body": {}
  }
  ```
* **Success Response (200 OK):**
  Decrypts credentials in-memory and merges path-level/connection-level custom headers before executing a real downstream Axios request against the target API.
  ```json
  {
    "status": 200,
    "statusText": "OK",
    "headers": {
      "content-type": "application/json",
      "date": "Mon, 01 Jun 2026 09:00:00 GMT"
    },
    "data": {
      "object": "list",
      "data": []
    },
    "latencyMs": 142,
    "sizeBytes": 482
  }
  ```

---

## 📊 Analytics Dashboard Routes (`/api/analytics`)

### 1. Query Gateway Statistics
* **Route:** `GET /api/analytics`
* **Success Response (200 OK):**
  ```json
  {
    "totalRequests": 1042,
    "averageCompressionRatio": 4.22,
    "activeConnectionsCount": 3,
    "liveRequestTracker": [
      {
        "timestamp": "2026-05-27T02:00:00Z",
        "gatewayName": "Stripe Payments Core",
        "method": "GET",
        "path": "/v1/charges",
        "status": 200,
        "originalSize": 45200,
        "prunedSize": 10800,
        "compressionRatio": 4.19
      }
    ]
  }
  ```

---

## 📡 Dynamic Model Context Protocol Routes (`/api/mcp`)

Exposes compliant MCP Servers over standard Server-Sent Events (SSE) persistence.

### 1. Establish SSE Client Handshake Connection
* **Route:** `GET /api/mcp/sse?apiKey=omni_gt_...&gatewayId=...`
* **Headers Required:** `Accept: text/event-stream`
* **Query Parameters:**
  - `apiKey`: Tenant master API Key (`omni_gt_...`)
  - `gatewayId` (Optional): ID of a specific `ConnectedAPI` database record to enforce gateway isolation.
* **Behavior:** Binds a persistent unidirectional response channel. Establishes a standard SSE session mapping and fires an initial JSON endpoint connection payload:
  ```event-stream
  event: endpoint
  data: /api/mcp/message?sessionId=session-abc-1234&gatewayId=api-12345
  ```
  *Note: If `gatewayId` is provided, the SSE session dynamically filters the tools list to only expose endpoints for that specific gateway.*

### 2. Client JSON-RPC 2.0 Message Gateway
* **Route:** `POST /api/mcp/message?sessionId=session-abc-1234&gatewayId=...`
* **Headers Required:** Authorization Bearer API Key (`omni_gt_...`)
* **Query Parameters:**
  - `sessionId`: The unique persistent active session ID generated during the SSE handshake.
  - `gatewayId` (Optional): Limits JSON-RPC operations strictly to the specified gateway context.
* **JSON-RPC Methods Handled:**
  - **`initialize`**: Resolves the client handshake context.
  - **`tools/list`**: Dynamically compiles all allowed paths in the spec as compliant flat JSON-Schema tool parameters. (If filtered by `gatewayId`, only exposes that gateway's allowed paths).
  - **`tools/call`**: Executes the tool call. Decrypts credentials in-memory, queries the REST API (injecting connection-level and path-level custom headers), prunes the payload via the Token-Saver, and streams the pruned context back to the LLM.
