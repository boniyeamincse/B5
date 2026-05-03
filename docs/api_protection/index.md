# B5 WAF API Protection & JSON Validation Guide

This section covers how B5 protects modern APIs and validates JSON payloads (Tasks 51-60).

## 51. Intercepting and Validating JSON Bodies
B5 uses OpenResty's `ngx.req.get_body_data()` and `cjson` module to parse incoming JSON.
- **Process**:
  1. Check `Content-Type` header for `application/json`.
  2. Buffer and read the request body.
  3. Attempt to parse with `cjson`.
  4. If parsing fails (malformed JSON), the request is blocked with a 400 Bad Request or logged as an attack attempt.

## 52. API Endpoint Allowlist (Strict Mode)
In **Strict Mode**, B5 blocks all requests to endpoints that are not explicitly defined in the Application Policy.
- **Configuration**: Set `API_STRICT_MODE=true`.
- **Definition**: Define allowed paths (e.g., `/api/v1/login`, `/api/v1/users`) in the policy engine.
- **Benefit**: Effectively eliminates "shadow APIs" and prevents attackers from discovering undocumented endpoints.

## 53. Blocking Disallowed HTTP Methods
You can restrict which HTTP methods (GET, POST, PUT, DELETE, PATCH) are allowed on a per-route basis.
- **Setup**: In the endpoint policy, specify the allowed methods.
- **Example**:
  - `/api/v1/products`: `GET` only.
  - `/api/v1/profile`: `GET`, `PUT`, `PATCH`.
- **Action**: B5 returns a 405 Method Not Allowed if a forbidden method is used.

## 54. Schema Validation Rules
B5 can perform basic structural validation on JSON payloads to ensure they match expected formats.
- **Rules**: Check for required keys, data types (string, number, boolean), and maximum string lengths.
- **Benefit**: Prevents malformed data from reaching and potentially crashing or exploiting the backend application logic.

## 55. Protecting GraphQL Endpoints
GraphQL endpoints are often targets for "Deep Query" or "Circular Query" denial-of-service attacks.
- **B5 Protections**:
  - **Query Depth Limiting**: Inspects the GraphQL string and counts the nesting levels.
  - **Complexity Analysis**: Blocks queries that request too many fields or relationships in a single call.

## 56. JWT Token Inspection
B5 inspects the `Authorization: Bearer [token]` header to ensure JWTs are well-formed before forwarding to the backend.
- **Checks**:
  - Validates the base64 structure of the Header, Payload, and Signature.
  - Checks for the "None" algorithm exploit.
  - *Optional*: Can be configured to verify the signature using a shared secret or public key.

## 57. Large JSON Payload Protection (DoS)
To prevent memory exhaustion attacks, B5 enforces strict body size limits.
- **Configuration**: Set `client_max_body_size` in Nginx and `B5_MAX_JSON_SIZE` in the Lua engine.
- **Action**: If a JSON payload exceeds the limit (e.g., 2MB), the connection is terminated immediately.

## 58. Rate Limiting API Keys/Tokens
Instead of just limiting by IP, B5 can extract an API Key or User Token from the headers and apply rate limits to that specific identifier.
- **Logic**: Uses the extracted token as the Redis key for the sliding window counter.
- **Benefit**: Effectively throttles specific users even if they rotate their IP address.

## 59. Stripping Sensitive Response Headers
B5 cleans up the backend's response headers to prevent information leakage.
- **Target Headers**: `Server`, `X-Powered-By`, `X-AspNet-Version`, `Via`.
- **Reason**: Hiding the backend technology stack (e.g., "FastAPI", "PHP 7.4") makes it harder for attackers to find version-specific exploits.

## 60. Tutorial: Securing a REST API
1. **Deploy B5**: Place B5 in front of your API gateway or backend service.
2. **Define Routes**: Map your endpoints in the dashboard.
3. **Enable JSON Validation**: Turn on body inspection for POST/PUT requests.
4. **Set Rate Limits**: Apply a 60 req/min limit per API Key.
5. **Monitor Logs**: Review the dashboard for "Malformed JSON" or "Method Not Allowed" events to tune your policies.
