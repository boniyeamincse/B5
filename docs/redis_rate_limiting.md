# B5 WAF — Redis Rate Limiting and IP Reputation Cache

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

## 1. Why Redis?

The B5 data plane (OpenResty/Lua) needs to make security decisions in **sub-millisecond time** on every request. PostgreSQL is not suitable for this because a round-trip query takes 1–5 ms under load, and it cannot safely handle thousands of concurrent writes for rate limit counters.

Redis is an **in-memory data store** with average latency of ~0.1 ms per operation on the same host. It supports **atomic increment operations**, making it ideal for request counters that multiple Nginx workers update concurrently without race conditions.

B5 uses Redis for five categories of data:

1. **Rate limit counters** — per-IP and per-route sliding window counters.
2. **Login brute-force counters** — failed login attempt tracking per user+IP.
3. **IP blocklist** — temporary blocked IPs with TTL-based expiry.
4. **IP reputation cache** — cached reputation scores for known malicious IPs.
5. **Compiled rule sets** — published by FastAPI, read by Lua on every request.

---

## 2. Redis Key Schema

B5 uses a consistent key naming convention: `prefix:qualifier:value`.

### 2.1 Per-IP Rate Limit Counter

Counts all requests from a single IP within a time window.

```
Key:    rate:ip:{ip}:{window_start}
Type:   String (integer counter)
TTL:    Equal to the window duration

Example:
  rate:ip:203.0.113.42:1746259200   → "147"
  (IP 203.0.113.42 has made 147 requests in the window starting at Unix timestamp 1746259200)
```

**Lua usage:**

```lua
local key    = "rate:ip:" .. ngx.var.remote_addr .. ":" .. window_start
local count  = red:incr(key)
red:expire(key, window_seconds)

if count > limit then
    return ngx.exit(429)  -- Too Many Requests
end
```

---

### 2.2 Per-Route Rate Limit Counter

Counts requests from a single IP to a specific route within a time window. Used to protect high-value endpoints like `/login` or `/api/checkout`.

```
Key:    rate:route:{route_hash}:{ip}:{window_start}
Type:   String (integer counter)
TTL:    Equal to the window duration

Example:
  rate:route:login:203.0.113.42:1746259200  → "12"
  (IP 203.0.113.42 has hit /login 12 times in this window)
```

The `route_hash` is a stable short identifier for the route (e.g., `login`, `checkout`, `api_v1_users`).

---

### 2.3 Login Brute-Force Counter

Counts failed authentication attempts for a specific username from a specific IP. Separate from general rate limiting to allow tighter thresholds on login endpoints.

```
Key:    brute:{app_id}:{username}:{ip}
Type:   String (integer counter)
TTL:    Lockout window (e.g., 900 seconds = 15 minutes)

Example:
  brute:3:admin:203.0.113.42  → "6"
  (6 failed login attempts for user "admin" from IP 203.0.113.42 on app ID 3)
```

When the counter exceeds the configured threshold (e.g., 5 attempts), the IP is temporarily blocked for that username.

---

### 2.4 Temporary IP Blocklist

IPs blocked manually by an administrator or automatically due to repeated violations.

```
Key:    block:{ip}
Type:   String ("1" or reason string)
TTL:    Configurable (e.g., 3600 = 1 hour, 86400 = 24 hours, no TTL = permanent)

Example:
  block:203.0.113.42  → "1"   (expires in 86400 seconds)
  block:198.51.100.0  → "1"   (no TTL — permanent block)
```

**Lua check:**

```lua
local is_blocked = red:get("block:" .. ngx.var.remote_addr)
if is_blocked ~= ngx.null then
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end
```

---

### 2.5 IP Reputation Cache

Caches the reputation score of an IP address fetched from an external threat intelligence feed or calculated internally from recent events.

```
Key:    iprep:{ip}
Type:   String (integer score 0–100)
TTL:    3600–86400 seconds (refreshed by background job)

Example:
  iprep:203.0.113.42  → "87"
  (IP has a reputation score of 87/100 — high risk)
```

A score above a configurable threshold (e.g., 75) causes B5 to block or challenge the request without needing a specific rule match.

---

### 2.6 Compiled Rule Sets

Rule sets published by FastAPI for the data plane to consume.

```
Key:    b5:rules:policy:{policy_id}
Type:   String (JSON-encoded rule array)
TTL:    3600 seconds (refreshed on every rule change)

Example:
  b5:rules:policy:1  → '[{"id":1,"pattern":"(?i)union.*select","target":"uri","action":"block","severity":"critical"}, ...]'
```

**Lua usage:**

```lua
local rules_json = red:get("b5:rules:policy:" .. policy_id)
local rules      = cjson.decode(rules_json)
```

---

### 2.7 Policy Mode Cache

Stores the active operating mode for each policy, so Lua doesn't need to decode the full rule set to know whether to block or log.

```
Key:    b5:policy:mode:{policy_id}
Type:   String ("blocking" | "logging" | "learning")
TTL:    3600 seconds

Example:
  b5:policy:mode:1  → "blocking"
```

---

### 2.8 Session/Token Cache

Short-lived admin session tokens (if using server-side sessions instead of stateless JWT).

```
Key:    session:{token_hash}
Type:   Hash (user_id, role, expires_at)
TTL:    Session lifetime (e.g., 3600 seconds)
```

---

## 3. Sliding Window Rate Limiting

B5 implements a **fixed-window rate limit** for the MVP (simple, low overhead). The planned upgrade is a **sliding window** algorithm.

### Fixed Window (MVP)

```
Window = 60 seconds
Limit  = 100 requests per IP per window

Unix timestamp → floor to nearest 60s → use as window key

Key: rate:ip:203.0.113.42:1746259200
     (window 1746259200 to 1746259259)

At 1746259260 a new key is created: rate:ip:203.0.113.42:1746259260
The old key expires automatically via Redis TTL.
```

**Limitation:** A client can send 100 requests at 1746259259 and 100 more at 1746259260 — getting 200 requests across the boundary.

### Sliding Window (Planned)

Uses a Redis sorted set where each request is scored by its timestamp:

```
Key:    rate:sw:{ip}
Type:   Sorted Set (score = Unix timestamp, member = unique request ID)

Algorithm:
  1. ZREMRANGEBYSCORE key 0 (now - window_seconds)  ← evict old entries
  2. ZADD key now request_id                         ← add current request
  3. ZCARD key                                        ← count in window
  4. If count > limit → block
  5. EXPIRE key window_seconds
```

This ensures that at any moment, the count reflects exactly the requests in the last N seconds.

---

## 4. Key Expiration Strategy

| Key Type | TTL | Reason |
|---------|-----|--------|
| `rate:ip:*` | Equal to window (e.g., 60s) | Counter becomes irrelevant after the window |
| `rate:route:*` | Equal to window | Same as above |
| `brute:*` | 900s (15 min) | Lockout resets after 15 minutes |
| `block:*` | Configured per block (1h–permanent) | Admin-defined |
| `iprep:*` | 3600–86400s | Refresh periodically from threat intel |
| `b5:rules:*` | 3600s | Refreshed on every rule change |
| `session:*` | Session lifetime | Forced expiry of admin sessions |

Redis handles expiration automatically using its built-in TTL mechanism. No background cleanup job is needed.

---

## 5. Whitelisting Internal IP Subnets

Some internal IPs (load balancers, health checkers, internal monitoring tools) should be exempt from rate limits.

```
Key:    allow:{ip}
Type:   String ("1")
TTL:    None (permanent) or configured

Example:
  allow:10.0.0.1   → "1"   (internal load balancer, never rate-limited)
```

In `access.lua`, the allowlist check runs before the rate limit check:

```lua
local is_allowed = red:get("allow:" .. ngx.var.remote_addr)
if is_allowed ~= ngx.null then
    -- skip all rate limit and reputation checks
    goto proxy_request
end
```

---

## 6. Redis Connection from Lua

B5 Lua scripts use the `lua-resty-redis` library for non-blocking Redis connections:

```lua
local redis = require "resty.redis"

local function get_redis()
    local red = redis:new()
    red:set_timeout(100)  -- 100ms timeout — fail fast if Redis is down
    local ok, err = red:connect(b5_config.redis_host, b5_config.redis_port)
    if not ok then
        ngx.log(ngx.ERR, "[B5] Redis connection failed: ", err)
        return nil
    end
    return red
end
```

> **If Redis is unavailable:** B5 fails open (allows the request) rather than blocking all traffic. This is a deliberate trade-off for availability. In production, use Redis Sentinel or Redis Cluster for high availability.

---

## 7. Redis Security Configuration

For production deployments:

```bash
# redis.conf recommendations
requirepass your-strong-redis-password
bind 127.0.0.1          # or bind to b5-network address only
protected-mode yes
rename-command FLUSHALL ""   # disable dangerous commands
rename-command DEBUG    ""
rename-command CONFIG   ""
```

In `docker-compose.yml`, pass the password:

```yaml
b5-redis:
  image: redis:alpine
  command: redis-server --requirepass "${REDIS_PASSWORD}"
```

---

## 8. Monitoring Redis

Key metrics to watch:

| Metric | Command | Alert If |
|--------|---------|----------|
| Memory usage | `INFO memory` | > 80% `maxmemory` |
| Key count | `DBSIZE` | Unexpectedly high (memory leak) |
| Hit rate | `INFO stats` → `keyspace_hits/misses` | Hit rate drops below 90% |
| Connected clients | `INFO clients` | Spikes above expected |
| Evictions | `INFO stats` → `evicted_keys` | Any evictions (increase `maxmemory`) |

```bash
# Connect to Redis inside Docker
docker exec -it b5-redis redis-cli

# Monitor live commands (debug only — do not run in production under load)
MONITOR
```

---

## 9. Related Documentation

| Document | Description |
|---------|-------------|
| [architecture_overview.md](architecture_overview.md) | Full system architecture |
| [openresty_lua_interaction.md](openresty_lua_interaction.md) | How Lua reads from Redis |
| [fastapi_control_plane.md](fastapi_control_plane.md) | How FastAPI publishes rules to Redis |
| [postgresql_configuration_storage.md](postgresql_configuration_storage.md) | What is stored in PostgreSQL vs Redis |
