# Security Baseline & Cryptographic Standards

This document describes the cryptography standards, session structures, and adversarial security controls implemented to protect the **Omni MCP Gateway**.

---

## 🔐 Encrypted Credential Vaulting (AES-256-GCM)

All third-party REST API authentication credentials (such as Bearer keys or basic auth credentials) must be encrypted both in-transit and at-rest using **AES-256-GCM**.

### 1. Cryptographic Key Derivation at Startup

To prevent cleartext exposure, the master key passphrase is never stored in the database. Instead:

1. The gateway retrieves the raw secret string `process.env.MASTER_ENCRYPTION_KEY` at startup.
2. The server processes this string through a secure cryptographic hashing function (`SHA-256`) to derive the actual **32-byte key** in-memory.
   ```typescript
   // Derived 32-byte symmetric AES key generated in-memory
   const DERIVED_AES_KEY = crypto.createHash('sha256').update(MASTER_KEY_RAW).digest();
   ```
3. The raw environment variable is immediately garbage-collected by the JS engine, maintaining the derived key purely in ephemeral system memory.

### 2. Encryption Loop Details

When a user hosts an authenticated connection, the gateway securely encrypts the credential value:

* **Algorithm:** `aes-256-gcm`
* **Initialization Vector (IV):** A unique, random 12-byte buffer is generated for every credential.
* **Authentication Tag:** A 16-byte authentication tag is generated at encryption time. This tag guarantees payload integrity, preventing cipher tampering or padding oracle vectors.
* **Storage:** The `encryptedData`, `iv` (hex), and `tag` (hex) are persisted across separate fields in the `EncryptedSecret` collection.

---

## ⏳ Timing-Safe User Authentication (scrypt)

To protect the platform against dictionary brute-force and remote timing attacks:

1. **Scrypt Salt Hashing:** User passwords and unverified OTP numbers are processed using Node's native `scryptSync` engine with a unique, high-entropy random 16-byte salt buffer.
2. **Timing-Safe Checks:** Instead of using standard string checks (which break early on mismatch and allow attackers to infer matching prefixes), comparison leverages timing-safe buffers:
   ```typescript
   // Protects against timing-based database credential extraction
   export function verifyPassword(password: string, storedValue: string): boolean {
     const [salt, hash] = storedValue.split(':');
     const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
     return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
   }
   ```

---

## 🍪 XSS-Resistant Cookie Session Scopes

Interactive browser sessions on the frontend use a stateful, secure cookie session boundary:

* **Signed Cookies:** Session tokens are signed via Express `cookie-parser` using the secure `SESSION_SECRET` passphrase, preventing client-side session forging.
* **HttpOnly:** The cookie is issued with the `httpOnly: true` parameter. This prevents client-side Javascript scripts from accessing the session token, mitigating Cross-Site Scripting (XSS) session hijacking.
* **SameSite Lax:** Restricts cross-site session leakage, protecting the platform against Cross-Site Request Forgery (CSRF) triggers.
* **Secure Flag:** In production environments, the cookie is issued with the `secure: true` configuration, requiring HTTPS transmission.

---

## 🛑 Allowed Mutation Constraints & Proxy Protections

To protect the connected REST APIs from indirect prompt injection vulnerabilities—where an LLM might be manipulated into executing unauthorized actions:

1. **Default Read-Only:** Every dynamically generated MCP capability defaults to a read-only `GET` request.
2. **Explicit Allowed Paths:** The proxy blocks any request that does not match the predefined schema mapping in `allowedPaths`.
3. **Write Protection Guards:** Mutating HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`) must be explicitly unlocked in the path settings by setting `isWritable: true`. 
4. **Adversarial Interception:** If a mutating method is called and its permission is set to `isWritable: false` (Read-Only), the security middleware drops the operation immediately, returning an HTTP `403 Forbidden` error without forwarding the call to the origin API.

```
Incoming MCP Execution -> [Authentication Check] -> [Endpoint Allowed List Match]
                                                           |
                                                           v
                                            [HTTP Method Mutation Check]
                                            Is GET? -> Forward Request
                                            Is POST/PUT/DELETE? -> Is Writable?
                                                                      |
                                             +------------------------+------------------------+
                                             |                                                 |
                                         Yes (True)                                         No (False)
                                             |                                                 |
                                             v                                                 v
                                  [Forward REST origin]                              [Drop with 403 Forbidden]
```
This multi-layered approach ensures that even if an LLM is compromised via prompt injection, it cannot execute destructive operations on connected systems without explicit, manual administrative authorization.
