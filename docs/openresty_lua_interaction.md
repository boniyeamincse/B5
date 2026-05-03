# B5 WAF — OpenResty and Lua Data Plane Interaction

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

## 1. Overview

The B5 data plane is built on **OpenResty**, a distribution of Nginx bundled with a full **LuaJIT** runtime. Instead of writing WAF logic as a compiled C module or a separate sidecar process, B5 embeds the inspection logic directly inside Nginx worker processes using Lua scripts.

This design means:

- WAF logic runs at **line speed** — in the same process as the Nginx request handler.
- No inter-process communication (IPC), no sockets, no separate daemon to maintain.
- Lua code is **JIT-compiled** by LuaJIT, reaching near-native execution speed.
- The full Nginx API (`ngx.*`) is available to Lua: read headers, read bodies, connect to Redis, exit with any HTTP status code.

---

## 2. What Is OpenResty?

OpenResty is not a fork of Nginx — it is Nginx with a set of official Lua modules baked in:

| Module | Function |
|--------|----------|
| `ngx_http_lua_module` | Embeds LuaJIT into every Nginx worker; exposes the `ngx.*` API |
| `lua-resty-redis` | Pure-Lua Redis client (non-blocking) |
| `lua-resty-http` | Pure-Lua HTTP client |
| `lua-resty-core` | FFI-based reimplementation of core ngx API (faster than the C API) |
| `lua-resty-string` | String utilities (base64, SHA, MD5) |

Because all I/O in OpenResty uses **cosockets** (cooperative sockets built on Nginx's event loop), Redis calls from Lua are **non-blocking** — they yield the Lua coroutine while waiting for the network, and Nginx serves other requests in the meantime.

---

## 3. Nginx Processing Phases

Nginx processes each HTTP request through a series of **phases**. OpenResty allows Lua code to hook into specific phases using directives in the Nginx config:

```
┌────────────────────────────────────────────────────┐
│              Nginx Request Phase Pipeline           │
│                                                     │
│  init_by_lua_file        ← runs at worker startup  │
│  set_by_lua_file         ← variable computation     │
│  rewrite_by_lua_file     ← URL rewriting            │
│  access_by_lua_file      ← ✅ B5 WAF INSPECTION     │
│  content_by_lua_file     ← generate response body   │
│  header_filter_by_lua_file ← modify response headers│
│  body_filter_by_lua_file   ← modify response body   │
│  log_by_lua_file         ← async event logging      │
└────────────────────────────────────────────────────┘
```

### Phases Used by B5

#### `init_by_lua_file` → `proxy/lua/init.lua`

Runs **once per worker process at startup** (not per request). B5 uses this phase to:

- Load global configuration (`B5_CONFIG`) into `_G` (Lua global table).
- Pre-compile regex patterns using `ngx.re.match` with the `"jo"` flags (JIT + cache compiled patterns).
- Connect to Redis and pre-warm any startup data.

```lua
-- init.lua
_G.B5_CONFIG = {
    mode = "blocking",
    redis_host = "b5-redis",
    redis_port = 6379,
    sql_patterns = {
        "(?i)union.*select",
        "(?i)select.*from",
        "(?i)drop.*table",
        "'.*or.*'.*="
    },
    xss_patterns = {
        "(?i)<script",
        "(?i)javascript:",
        "(?i)onerror=",
        "(?i)onload="
    }
}
```

> **Why `_G`?** Variables stored in `_G` are accessible in all subsequent Lua phases within the same worker process. This avoids re-reading config from Redis or disk on every request.

#### `access_by_lua_file` → `proxy/lua/access.lua`

Runs **on every incoming request**, before Nginx decides to proxy it or serve content. This is the **WAF enforcement point**.

If `ngx.exit()` is called here, Nginx stops processing and sends the HTTP error response immediately. The `proxy_pass` directive is never reached.

#### `log_by_lua_file` (planned)

Runs **after the response is sent to the client**. This phase is ideal for async security event logging because:

- The client has already received their response — logging latency doesn't affect them.
- Complex operations (Redis writes, HTTP calls to a log shipper) are safe here.

---

## 4. What B5 Inspects

The `access.lua` script inspects different parts of an HTTP request. Here is what each inspection target covers and how it is accessed in Lua:

### 4.1 URI / URL Path

```lua
local req_uri = ngx.var.request_uri  -- e.g. /search?q=1'+OR+'1'='1
local decoded  = ngx.unescape_uri(req_uri)
```

**Why decode?** Attackers encode payloads like `%27` (single quote) or `%3Cscript%3E` to evade simple string matching. B5 always decodes before matching.

### 4.2 Query String

```lua
local args = ngx.req.get_uri_args()
-- args["q"] == "1' OR '1'='1"
```

Individual query parameters can be inspected separately from the URI to enable more targeted rule matching.

### 4.3 HTTP Headers

```lua
local headers = ngx.req.get_headers()
local ua      = headers["User-Agent"]
local referer = headers["Referer"]
local cookie  = headers["Cookie"]
```

Headers are a common attack vector for XSS (via `Referer`), SSRF, and bot detection (via `User-Agent`).

### 4.4 Request Body (POST / PUT)

```lua
ngx.req.read_body()
local body = ngx.req.get_body_data()
-- or for form data:
local post_args = ngx.req.get_post_args()
```

> **Important:** `ngx.req.read_body()` must be called **before** `get_body_data()`. In `nginx.conf`, set `lua_need_request_body on` or call `read_body()` explicitly.

Body inspection catches SQL injection and XSS in JSON APIs, HTML form submissions, and file upload metadata.

### 4.5 Cookies

Cookies are part of the `Cookie` header and are parsed using:

```lua
local cookie_header = ngx.var.http_cookie
```

Or using the `lua-resty-cookie` library for structured access.

### 4.6 Method

```lua
local method = ngx.req.get_method()  -- "GET", "POST", "DELETE", etc.
```

B5 can block disallowed HTTP methods per route (e.g., reject `DELETE` on a public API endpoint).

---

## 5. How Lua Applies WAF Rules

### 5.1 Pattern Matching with `ngx.re.match`

B5 uses Perl-Compatible Regular Expressions (PCRE) via OpenResty's `ngx.re.match`:

```lua
local m, err = ngx.re.match(target_string, pattern, "ijo")
```

**Flags used:**

| Flag | Meaning |
|------|---------|
| `i` | Case-insensitive match |
| `j` | Enable PCRE JIT compilation (significant speed boost) |
| `o` | Cache compiled regex in worker memory (avoids recompile on every request) |

### 5.2 Rule Check Loop

```lua
-- Example: check URI against all SQL injection patterns
local uri_decoded = ngx.unescape_uri(ngx.var.request_uri)

for _, pattern in ipairs(b5_config.sql_patterns) do
    if ngx.re.match(uri_decoded, pattern, "ijo") then
        ngx.log(ngx.WARN, "[B5 BLOCK] SQLi matched: ", pattern,
                " | IP: ", ngx.var.remote_addr,
                " | URI: ", ngx.var.request_uri)
        return ngx.exit(ngx.HTTP_FORBIDDEN)  -- 403
    end
end
```

### 5.3 Redis-Based Rule Lookup (planned)

For dynamic rules managed via the dashboard, rules are loaded from Redis rather than hardcoded in `init.lua`:

```lua
local redis = require "resty.redis"
local red   = redis:new()
red:set_timeout(100)  -- 100ms timeout
red:connect(b5_config.redis_host, b5_config.redis_port)

local rules_json = red:get("b5:rules:app:" .. app_id)
local rules      = cjson.decode(rules_json)
```

---

## 6. How Lua Decides Actions

B5 supports four actions. Each action is a specific Lua call:

| Action | Lua Code | HTTP Response |
|--------|---------|---------------|
| **Block** | `ngx.exit(ngx.HTTP_FORBIDDEN)` | 403 Forbidden |
| **Rate limit exceeded** | `ngx.exit(429)` | 429 Too Many Requests |
| **Log only** | `log_event(...)` — no exit | Request passes through |
| **Allow** | No action taken | Request proxied normally |
| **Challenge** (planned) | Return a CAPTCHA page | 200 with challenge form |

### Decision Priority

```
1. Is IP in explicit blocklist?          → BLOCK (403)
2. Is rate limit exceeded for this IP?   → RATE LIMIT (429)
3. Does request match a WAF rule?        → depends on mode:
       blocking  → BLOCK (403)
       logging   → LOG only, allow
       learning  → allow, record pattern
4. Default                               → ALLOW, proxy_pass
```

---

## 7. How OpenResty Forwards Safe Requests

When no Lua check calls `ngx.exit()`, Nginx proceeds to the `proxy_pass` directive defined in `b5.conf`:

```nginx
location / {
    access_by_lua_file lua/access.lua;

    proxy_pass http://dummy-app:80;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The `X-Real-IP` and `X-Forwarded-For` headers pass the original client IP to the backend application, preserving proper logging and access control on the backend side.

---

## 8. Example: Complete Request Inspection Flow

The following walks through how B5 handles a SQL Injection attempt:

```
Client sends:
  GET /products?id=1'+UNION+SELECT+username,password+FROM+users-- HTTP/1.1
  Host: example.com
  User-Agent: Mozilla/5.0

──────────────────────────────────────────────────────────────────
Step 1: Nginx enters access phase, invokes access.lua
──────────────────────────────────────────────────────────────────

  local req_uri = ngx.var.request_uri
  -- "/products?id=1'+UNION+SELECT+username,password+FROM+users--"

  local decoded = ngx.unescape_uri(req_uri)
  -- "/products?id=1' UNION SELECT username,password FROM users--"

──────────────────────────────────────────────────────────────────
Step 2: Loop through sql_patterns
──────────────────────────────────────────────────────────────────

  Pattern: "(?i)union.*select"
  ngx.re.match(decoded, "(?i)union.*select", "ijo")
  → MATCH FOUND

──────────────────────────────────────────────────────────────────
Step 3: Log and block
──────────────────────────────────────────────────────────────────

  ngx.log(ngx.WARN,
    "[B5 BLOCK] SQLi | IP: 203.0.113.42 | URI: /products?id=1'+UNION...")

  ngx.exit(403)
  → Nginx sends HTTP 403 response immediately.
  → proxy_pass is never reached.
  → Backend application never sees the request.

──────────────────────────────────────────────────────────────────
Step 4 (log phase, async): Write security event to OpenSearch
──────────────────────────────────────────────────────────────────
  {
    "timestamp":   "2026-05-03T10:22:01Z",
    "client_ip":   "203.0.113.42",
    "method":      "GET",
    "path":        "/products",
    "attack_type": "SQL Injection",
    "rule_id":     "sqli-001",
    "action":      "blocked",
    "severity":    "critical"
  }
```

---

## 9. Performance Characteristics

| Metric | Typical Value |
|--------|--------------|
| Lua script overhead (simple check) | < 0.1 ms |
| Redis read (same host, cosocket) | ~0.1–0.3 ms |
| PCRE regex match (JIT compiled) | ~0.01–0.05 ms per pattern |
| Full inspection pipeline (10 patterns) | ~0.5–1.5 ms total |

Because LuaJIT uses JIT compilation and PCRE patterns are cached with the `"o"` flag, the inspection cost is stable and does not grow linearly with traffic volume.

---

## 10. Adding a New Inspection Module

To add a new check (e.g., path traversal detection) to B5:

1. Add the patterns to `_G.B5_CONFIG` in `init.lua`:

```lua
path_traversal_patterns = {
    "\\.\\./",
    "(?i)%2e%2e%2f",
    "(?i)\\.\\./.*\\.\\."
}
```

2. Add a check loop in `access.lua`:

```lua
for _, pattern in ipairs(b5_config.path_traversal_patterns) do
    if ngx.re.match(decoded_uri, pattern, "ijo") then
        log_event("Path Traversal", pattern)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end
```

3. Reload OpenResty (`nginx -s reload`) — **no full restart required**.

---

## 11. Related Documentation

| Document | Description |
|---------|-------------|
| [architecture_overview.md](architecture_overview.md) | Full system architecture |
| [waf_modes.md](waf_modes.md) | Learning, Logging, and Blocking mode behaviour |
| [request_lifecycle.md](request_lifecycle.md) | Full request lifecycle state diagram |
| [glossary.md](glossary.md) | WAF term definitions |
