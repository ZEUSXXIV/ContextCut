# Omni Rest-to-MCP: Comprehensive Feature & Capability Guide

Omni Rest-to-MCP is a premium, enterprise-grade, low-overhead Model Context Protocol (MCP) gateway proxy and developer observability suite. It bridges arbitrary JSON/YAML OpenAPI microservices to standards-based AI tools dynamically while ensuring context conservation, secure secrets custody, and full OpenTelemetry visibility.

---

## 1. Dynamic OpenAPI-to-MCP Tooling Engine
* **Instant Bridge Parsing**: Connect any third-party JSON/YAML OpenAPI specification via a remote spec URL or direct raw payload upload.
* **On-the-Fly Schema Mapping**: Automatically compile OpenAPI paths, operational descriptions, path params, query options, and schema payloads into standard MCP tool descriptions (`tools/list`).
* **Intelligent Parameter Routing**: Dynamically distribute LLM arguments to request segments (Path substitution, URL query parameters, or JSON bodies) using standard schema specifications and smart HTTP heuristics.
* **Granular Gateway Permissions**: Easily enable/disable specific paths or toggles and restrict mutations (`POST`, `PUT`, `DELETE`) to a secure read-only `GET` baseline unless explicitly authorized.

---

## 2. Context Compression & "Token-Saver" Engine
* **Mitigate Context Bloat**: Prevents LLM system exhaustion and context truncation by compressing bulky REST JSON payloads before transmitting them back to the LLM.
* **Array Truncation Bounds**: Automatically caps large nested JSON arrays to a custom-configured size limit (e.g., maximum 50 elements) to prevent database dumps from overwhelming the model.
* **Deep Nesting Pruning**: Recursively traverses complex response structures, stripping extraneous objects below a specified maximum JSON depth (e.g., 4 levels).
* **Metadata & Redundancy Stripping**: Automatically prunes typical web API metadata keys (such as `_links`, `href`, `metadata`, `status_details`, `pagination_hashes`) and slices text strings beyond character limits.
* **Massive Cost Reduction**: Achieves typical payload size reductions of **70% to 90%**, slashing downstream LLM prompt billing and boosting model reasoning speeds.

---

## 3. Distributed "Traceparent" Observability Tracing
* **W3C Standard Compliance**: Implements full W3C Trace Context propagation inside the Express proxy layers. Downstream requests carry valid standard trace headers:
  ```http
  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
  ```
* **Advanced Context Capture Heuristics**: Automatically inspects connection sessions, HTTP request headers, and custom JSON-RPC parameters to extract critical telemetry:
  * **Client Orchestrator Identification**: Captures the developer program (e.g., `Cursor`, `Claude Desktop`, `LangChain MCP`) via the `initialize` handshake.
  * **AI Model Metrics**: Extracts active AI model names (e.g. `claude-3.5-sonnet`, `gpt-4o`).
  * **User Prompt & Intent**: Stores the exact user instruction that triggered the tool call.
* **MongoDB TTL Index Hygiene**: Traces are capped and stored safely with a 7-day MongoDB Time-To-Live (TTL) index (`expireAfterSeconds: 604800`) to maintain high database speed and clean storage.

---

## 4. Premium Observability Timeline Explorer Dashboard
* **Glassmorphic Analytics UI**: A stunning dark-mode developer console delivering high-level charts, gateway volume tracking, and real-time Token-Saver optimization statistics.
* **Live Request Tracker**: A console tracking live incoming tool requests with responsive status indicators and quick-view metrics.
* **Interactive Latency Timeline**: Clicking on any request opens an overlay showing step-by-step processing latency splits:
  1. **LLM Request Trigger** (`0ms`) — Captures model parameters and client session handshakes.
  2. **Omni Proxy Handshake** (`+Xms`) — Salted credential keys decrypted in-memory and custom headers merged.
  3. **REST Downstream API Dispatch** (`+Yms`) — Remote Axios execution with copyable `traceparent` headers.
  4. **Token-Saver Optimization Cap** (`<1ms`) — Compares original sizes against optimized outputs.
  5. **JSON-RPC Output Delivered** (`Total Latency`) — Transmits the response safely back.
* **Advanced Telemetry Explorer**: Inspect three tabs of complete payloads:
  * **Parameters**: Query parameters, headers, and body arguments with **sensitive tokens redacted as `[REDACTED]`**.
  * **Raw Response**: The uncompressed, complete origin REST JSON.
  * **Optimized Output**: The final compressed output delivered to the LLM.

---

## 5. Security Vault & Tenant Session Protection
* **AES-256-GCM Vault**: Encrypts all third-party REST tokens (e.g., API keys, Authorization headers) at-rest in MongoDB. Encryption utilizes unique IV buffers and authentication tags decrypted solely in-memory.
* **Tenant Credential Isolation**: Secure multi-tenant architecture ensures developer API keys never bleed or cross boundaries.
* **Signed Cookie Sessions**: Global `cookie-parser` session enforcement ensures robust authentication guards.
* **OTP Sign-Up Flow**: Dynamic 6-digit numeric OTP generation, timing-safe `scrypt` hashing, and secure 5-minute auto-expiry rules.
