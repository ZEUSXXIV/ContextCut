# System Setup & Installation Guide

This document describes the process required to configure, install, test, and run the complete **Omni MCP Gateway** environment locally.

---

## ⚙️ Environment Configurations

Before starting the applications, configure the environment settings inside `/backend/.env`.

Create a file named `backend/.env` (or verify its presence) with the following structure:

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/omni-mcp-gateway
MASTER_ENCRYPTION_KEY=super-secret-high-entropy-master-passphrase-must-be-changed-in-production-998877
SESSION_SECRET=high-entropy-cookie-session-signing-secret-1234567890
NODE_ENV=development
```

### Environment Parameters:
* `PORT`: Port configuration for the modular Express server (default `3001`).
* `MONGO_URI`: Absolute connection string to your MongoDB daemon instance.
* `MASTER_ENCRYPTION_KEY`: A safe high-entropy string used at runtime by a SHA-256 cryptographic hashing function to derive the symmetric 32-byte AES-256-GCM key in-memory.
* `SESSION_SECRET`: Signature passphrase key used by `cookie-parser` to cryptographically sign HTTP sessions.

---

## 🚀 Step-by-Step Installation

### Prerequisites:
- **Node.js:** version `v20.0.0` or higher.
- **MongoDB:** An active running MongoDB instance listening on port `27017`.

### 1. Install Workspace Dependencies

Execute the following commands to install libraries in all three environments:

```bash
# 1. Install Core Backend Dependencies
cd backend
npm install

# 2. Install Next.js Frontend Dependencies
cd ../frontend
npm install

# 3. Install Mock REST Backend Dependencies
cd ../dummy-swagger-backend
npm install
```

---

## 🧪 Running Automated Jest Tests

The backend features a fully mocked test configuration mapping cryptography, pruning parameters, and dynamic routing checks:

```bash
cd backend
npm test
```

### Expected Output:
All six test suites containing 29 test assertions must execute and pass:
```bash
PASS src/routes/auth.test.ts
PASS src/routes/mcp.test.ts
PASS src/routes/apis.test.ts
PASS src/utils/cryptography.test.ts
PASS src/utils/tokenSaver.test.ts
PASS src/utils/toonEncoder.test.ts

Test Suites: 6 passed, 6 total
Tests:       29 passed, 29 total
Snapshots:   0 total
```
*Note: In the test environment, the Express server automatically binds to port `0` to dynamically pick a random ephemeral open port, completely preventing address collisions (`EADDRINUSE`) during parallel or live test runs.*

---

## 🛠️ Launching Development Environments

To test the end-to-end integration, spawn all three servers concurrently. It is recommended to use three separate terminal windows:

### Terminal 1: Mock REST Server
Serves a bloated Swagger schema on port `4000` with nested array blocks and authorization constraints:
```bash
cd dummy-swagger-backend
npm start
```

### Terminal 2: Core Express Gateway
Serves the proxy engine and authenticates incoming client traffic on port `3001`:
```bash
cd backend
npm run dev
```
*Note: On database connection, the backend automatically seeds a default verified developer tenant (`developer@omnimcp.local` / `developer123` with API Key `omni_gt_developer_key_123456`) if the database is clean.*

### Terminal 3: Next.js Frontend Dashboard
Serves the dark mode management dashboard on `http://localhost:3000`:
```bash
cd frontend
npm run dev
```

---

## 🧪 Local Sandbox Verification Flow

If the Express backend (port `3001`) is offline, the Next.js frontend automatically activates a robust **Local Sandbox Mode**. 

### Sandbox Verification Lifecycle:
1. Open your browser and navigate to `http://localhost:3000`.
2. You will be greeted by a premium glassmorphic authentication gate.
3. If the backend is down, a prominent warning alert will appear at the top. The gate will reveal a **"Sandbox Demo Mode Active"** banner at the bottom.
4. **Quick Bypass:** Click **"Quick Bypass (Demo Entry)"** to automatically populate local memory with dummy gateways (Stripe, GitHub APIs) and redirect you straight to the active dashboard.
5. **Simulated OTP Form:** 
   - Click **Register** or **Login**.
   - Input `developer@omnimcp.local` and `developer123`.
   - Submit the credentials to transition to the **Segmented OTP Grid**.
   - Type `1`, `2`, `3`, `4`, `5`, `6` in the auto-shifting input boxes. On submitting, you will be successfully authenticated.
6. **Postman-style Request Testing & Client Sandbox:**
   - Select a connected API connection from the interactive Sidebar Tree in the left panel to expand its endpoints.
   - Click any endpoint to open an isolated Request Workspace Tab.
   - Customize the request context: enter query parameters, URL path parameters, and request body variables in their dedicated interactive tabs.
   - View the automatically populated path-specific custom headers (e.g. `x-rapidapi-key`) or perform bulk editing by pasting lines of `Key: Value` configurations.
   - Press **"Send"** to dispatch the downstream Axios request securely through the server, decrypting vault credentials on-the-fly.
   - Inspect the live response: compare raw JSON output directly against the optimized "Token-Saver" JSON output and the custom ultra-compact **TOON (Tabular Object-Oriented Notation)** format side-by-side with dynamic compression savings metrics.
