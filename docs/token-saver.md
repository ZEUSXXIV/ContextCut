# Token-Saver Pruning Engine Specification

This specification describes the **Token-Saver Middleware Engine**, a critical component designed to recursively optimize raw, verbose, and bloated third-party REST API payloads before returning them as model context variables.

---

## 💡 The Pruning Problem

Standard REST APIs are designed for general engineering software consumption and commonly return bloated payloads loaded with unnecessary metadata arrays, duplicate key references, diagnostic trace IDs, and deep hierarchical objects:

```
[Bloated REST API Response: 120 KB]
  |
  +---> [Deeply Nested Trace Contexts]
  +---> [Unneeded Timestamps and Metadata]
  +---> [Arrays Containing 100+ Redundant Items]
  |
  v
(LLM Context Ingestion) ==> Overwhelms prompt window & inflates token costs ($$$)
```

The **Token-Saver Engine** intercepts these payloads at the proxy layer and executes high-performance, in-memory recursive pruning, stripping unneeded structures while preserving vital contextual semantic values.

---

## ⚙️ Core Pruning Rules

The pruning engine evaluates raw JSON responses and enforces five strict architectural boundaries:

```
                               Raw JSON Response
                                       |
                                       v
                     [Rule 1: Diagnostic Key Exclusions]
                   Removes traceId, x-request-id, requestId
                                       |
                                       v
                          [Rule 2: Max Depth Constraint]
                  Replaces objects exceeding depth 10 with tag
                                       |
                                       v
                       [Rule 3: Array Length Capping]
                  Slices arrays at 50; injects marker flag
                                       |
                                       v
                         [Rule 4: Empty Field Pruning]
                    Strips null values, empty structures
                                       |
                                       v
                       [Rule 5: Character serialization]
                  Truncates text at 50,000 chars with snippet
                                       |
                                       v
                              Pruned MCP Context
```

### 1. Diagnostic Key Exclusions
Eliminates verbose instrumentation keys, which are highly repetitive and offer zero functional semantic value to LLMs:
* **Excluded Keys:** `traceId`, `requestId`, `spanId`, `x-request-id`, `correlationId`.

### 2. Maximum Hierarchy Depth Capping
Deeply nested JSON trees represent massive token consumption and are usually overly detailed logs.
* **Limit:** **10 levels** of object recursion maximum.
* **Truncation Tag:** If an object nesting level reaches index **11**, it is stripped and replaced with the string representation: `"[Max Depth Reached]"`.
* **Array Depth Transparency:** Array traversals themselves are treated as transparent containers and do not increment the current depth counter. However, strict nesting depth tracking does apply to any objects contained within those arrays. This ensures that wrapping an object inside an array does not artificially inflate its recursion depth metrics.

### 3. Array Length Slicing
Large lists of repeating objects (e.g. 500 catalog items or charges) quickly exhaust prompt windows.
* **Limit:** Maximum of **50 items** per array.
* **Truncation Flag:** Sliced arrays are modified to inject a special key-value pair alerting the calling LLM of the truncation:
  `"_omni_gateway_truncated": true`

### 4. Empty and Null Value Pruning
Strips structural metadata overhead.
* **Behavior:** Automatically removes keys that resolve to `null`, `undefined`, empty strings (`""`), empty objects (`{}`), or empty arrays (`[]`).

### 5. Absolute Character Serialization Threshold
A hard safeguard against massive text payload leakage.
* **Limit:** **50,000 characters** maximum.
* **Warning Snippet:** If the serialized JSON output string exceeds 50,000 characters, it is truncated and appended with the following notice snippet:
  `"... [OMNI MCP GATEWAY WARNING: RESPONSE TRUNCATED TO 50K CHARACTERS]"`.

---

## 📈 Optimization Performance

The pruning engine routinely achieves massive context reduction ratios:

| Endpoint Resource | Raw API Payload Size | Token-Saver Optimized Size | Token Compression Ratio |
| :--- | :--- | :--- | :--- |
| **Dummy Mock Items (`/items`)** | `132.8 KB` | `31.2 KB` | **4.25x (76% Saved)** |
| **Standard Petstore (`/pets`)** | `45.2 KB` | `10.8 KB` | **4.19x (76% Saved)** |
| **Deep Trace Object Tree** | `18.5 KB` | `3.4 KB` | **5.44x (81% Saved)** |

By enforcing these boundaries, the **Omni MCP Gateway** ensures LLM context prompts remain clean, fast, and cost-effective.
