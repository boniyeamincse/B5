# B5 WAF — Architecture Overview

**Version:** 2.0  
**Last Updated:** 2026-05-03  
**Status:** Living Document

---

## 1. What Is B5?

B5 is a modern **Web Application Firewall (WAF)** built on a reverse-proxy model. It sits between clients (browsers, mobile apps, API consumers) and your backend web application, inspecting every HTTP/HTTPS request before it reaches your server.

B5 protects against:

- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Command Injection
- Path Traversal and Local/Remote File Inclusion
- Brute-force login attacks
- Bot and scraper traffic
- API abuse and malformed payloads
- Layer 7 Denial-of-Service (DoS)

B5 is designed to be simple to deploy, easy to tune, and straightforward to extend. The first version (MVP) targets Docker-based deployments and focuses on correctness and usability over complexity.

---

## 2. Why a Reverse-Proxy Architecture?

A **reverse proxy** receives requests on behalf of a backend server. The client only ever connects to the proxy — the backend is never directly exposed.

Benefits of this model for a WAF:

| Benefit | Explanation |
|--------|-------------|
| **Inline inspection** | Every request passes through B5 with no client-side agents or code changes needed on the backend. |
| **TLS termination** | B5 can decrypt HTTPS traffic, inspect it, then optionally re-encrypt before forwarding. |
| **Backend agnostic** | B5 works in front of any backend: Node.js, PHP, Django, static sites, etc. |
| **Low latency** | OpenResty (Nginx + Lua) adds sub-millisecond overhead per request. |
| **Single enforcement point** | Security policies are enforced in one place rather than inside each application. |

**Limitations:**

- B5 only sees HTTP traffic — encrypted traffic inside the application (e.g., encrypted database queries) is out of scope.
- Like any WAF, it can produce false positives if rules are too aggressive.
- It does not replace application-level security (input validation, parameterised queries, etc.).

---

## 3. High-Level Request Flow

```
                          ┌────────────────────────────────────────────────────┐
                          │                  B5 WAF System                     │
                          │                                                     │
  Internet Client         │  ┌─────────────────────────────────────────────┐   │
  ──────────────          │  │          Data Plane (OpenResty)              │   │
  Browser / App  ─HTTP──► │  │  1. TLS Termination                         │   │
                          │  │  2. Normalize request (unescape, decode)     │   │
                          │  │  3. Load policy from Redis                   │   │
                          │  │  4. Check IP reputation / blocklist          │   │
                          │  │  5. Apply rate limits                        │   │
                          │  │  6. Match WAF rules (SQLi, XSS, etc.)        │   │
                          │  │  7. Decide: BLOCK / LOG / ALLOW              │   │
                          │  │  8. Forward to backend OR return 403/429     │   │
                          │  │  9. Log security event (async)               │   │
                          │  └───────────────┬─────────────────────────────┘   │
                          │                  │ proxy_pass (clean requests only) │
                          │                  ▼                                  │
                          │       ┌──────────────────────┐                     │
                          │       │   Backend Application │                     │
                          │       │   (your web app/API)  │                     │
                          │       └──────────────────────┘                     │
                          └────────────────────────────────────────────────────┘
```

---

## 4. Data Plane vs. Control Plane

B5 separates its responsibilities into two clearly defined planes. This is a standard pattern in network security systems.

### Data Plane (OpenResty + Lua)

The **data plane** handles live traffic. It runs at line speed and must make a decision on every request within milliseconds.

- Reads pre-compiled rules and policies from Redis.
- Executes Lua scripts to inspect requests.
- Takes action: block, allow, or log.
- Writes security events asynchronously.
- Does **not** write back to PostgreSQL at request time — that would be too slow.

### Control Plane (FastAPI + PostgreSQL)

The **control plane** manages the configuration of the WAF. It is used by administrators, not by live traffic.

- Stores all rules, policies, applications, and users in PostgreSQL.
- Exposes a REST API consumed by the admin dashboard.
- Publishes compiled rule sets to Redis so the data plane picks them up.
- Reads security events from OpenSearch for reporting.

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA PLANE (hot path — microseconds per request)               │
│                                                                  │
│  OpenResty (Nginx + Lua) ──reads──► Redis                        │
│       │                                                          │
│       └──writes events──► OpenSearch (async)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (admin path — seconds per operation)             │
│                                                                  │
│  Next.js Dashboard ──calls──► FastAPI ──reads/writes──► PostgreSQL│
│                                   │                              │
│                                   └──publishes rules──► Redis    │
│                                   └──queries events──► OpenSearch│
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Main System Components

### 5.1 OpenResty (Data Plane Proxy)

| Property | Value |
|---------|-------|
| Image | `openresty/openresty:bullseye` |
| Container | `b5-proxy` |
| Ports | `80` (HTTP), `443` (HTTPS) |
| Role | Intercepts all traffic, executes WAF logic, proxies clean requests |

OpenResty is Nginx with an embedded LuaJIT runtime. This lets B5 run programmable security logic (Lua scripts) directly inside Nginx worker processes — with no separate process, no IPC, and no significant latency penalty.

Key files:

| File | Purpose |
|------|---------|
| `proxy/conf/nginx.conf` | Worker settings, logging format, included configs |
| `proxy/conf/b5.conf` | Virtual host; invokes Lua via `access_by_lua_file` |
| `proxy/lua/init.lua` | Runs at startup; loads global config and patterns |
| `proxy/lua/access.lua` | Runs per request; executes all inspection checks |

### 5.2 FastAPI (Control Plane API)

| Property | Value |
|---------|-------|
| Container | `b5-backend` |
| Role | REST API for managing rules, policies, applications, users |

FastAPI is an async Python framework. It handles all admin operations and serves as the bridge between the dashboard, the database, and the data plane.

### 5.3 PostgreSQL (Persistent Configuration Store)

| Property | Value |
|---------|-------|
| Image | `postgres:15-alpine` |
| Container | `b5-postgres` |
| Role | Source of truth for all WAF configuration |

Stores rules, policies, applications, users, audit logs, and system settings. The data plane never queries PostgreSQL directly during request processing.

### 5.4 Redis (Fast In-Memory Cache)

| Property | Value |
|---------|-------|
| Image | `redis:alpine` |
| Container | `b5-redis` |
| Role | Hot-path data: compiled rules, rate limit counters, IP reputation, sessions |

Redis bridges the control plane (slow writes) and the data plane (fast reads). Rule changes written to PostgreSQL are immediately published to Redis, making them available to Lua scripts on the next request.

### 5.5 OpenSearch / Elasticsearch (Log Store)

| Property | Value |
|---------|-------|
| Role | Stores, indexes, and searches security events |

All security events (blocked requests, violations, rate limit hits) are logged as structured JSON and shipped to OpenSearch asynchronously. The control plane queries OpenSearch to power dashboard analytics and reports.

### 5.6 Next.js Frontend (Admin Dashboard)

| Property | Value |
|---------|-------|
| Container | `b5-frontend` |
| Role | Admin UI for managing policies, reviewing events, configuring rules |

A React single-page application built with Next.js and Tailwind CSS. Communicates exclusively with the FastAPI control plane. Administrators never interact with the data plane directly.

---

## 6. Full System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               B5 WAF — Full System                               │
│                                                                                  │
│  ┌────────────┐   HTTPS    ┌──────────────────────────────────────────────────┐ │
│  │            │ ─────────► │              b5-proxy (OpenResty)                │ │
│  │  Internet  │            │  init.lua (startup) + access.lua (per request)   │ │
│  │  Client    │ ◄───────── │  ────────────────────────────────────────────    │ │
│  └────────────┘            │  reads rules / rate limits ◄──── b5-redis        │ │
│                            │  writes events ──────────────► OpenSearch        │ │
│                            │  proxy_pass (clean) ──────────► dummy-app / app  │ │
│                            └──────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        ADMIN / CONTROL PATH                                 │ │
│  │                                                                              │ │
│  │  ┌────────────────┐  REST API  ┌──────────────────┐  ORM  ┌──────────────┐ │ │
│  │  │  b5-frontend   │ ─────────► │  b5-backend      │ ────► │ b5-postgres  │ │ │
│  │  │  (Next.js)     │ ◄───────── │  (FastAPI)       │ ◄──── │ (PostgreSQL) │ │ │
│  │  └────────────────┘            │                  │       └──────────────┘ │ │
│  │                                │  publishes rules ├──────► b5-redis        │ │
│  │                                │  queries events  ├──────► OpenSearch      │ │
│  │                                └──────────────────┘                        │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  All services connected via: b5-network (Docker bridge)                         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. How Traffic Moves Through B5

### Step-by-step for a single request

1. **Client connects** to B5 on port 80 or 443.
2. **TLS termination** (port 443): B5 decrypts the HTTPS connection. The backend receives plain HTTP.
3. **init.lua** has already loaded `B5_CONFIG` at Nginx startup (global patterns, Redis address, operating mode).
4. **access.lua** runs:
   - Unescapes the URI to defeat encoding-based evasion.
   - Reads the application's active policy from Redis.
   - Checks the client IP against the Redis blocklist and reputation cache.
   - Checks the sliding-window rate limit counter in Redis.
   - Matches the URI, query string, headers, and body against WAF rule patterns.
5. **Decision:**
   - **Block** → `ngx.exit(403)` or `ngx.exit(429)`. Event logged.
   - **Log** → Request passes through but an alert event is written.
   - **Allow** → `proxy_pass` forwards the request to the backend.
6. **Backend responds.** Response passes back through Nginx to the client.
7. **Log phase**: Security event JSON is written asynchronously to OpenSearch.

---

## 8. How Security Decisions Are Made

B5 applies checks in a prioritised order. The first match wins and processing stops.

```
Priority  Check                       Source
────────  ──────────────────────────  ──────────────────
1         Explicit IP blocklist        Redis block:{ip}
2         IP reputation score          Redis iprep:{ip}
3         Rate limit exceeded          Redis rate:ip:{ip}
4         WAF rule match (SQLi/XSS…)  Redis / B5_CONFIG
5         Policy mode (block/log/learn) Redis policy:{app_id}
6         Default: allow               —
```

Each step is implemented as a Lua function call. If no check triggers, the request is forwarded.

---

## 9. How Logs Are Generated

B5 generates two types of logs:

### 9.1 Security Event Logs (OpenSearch)

Generated by `access.lua` when a rule matches, a rate limit is hit, or an IP is blocked. Written asynchronously using `ngx.timer.at` or `ngx.log` with a shipping agent. Each event is a JSON object with fields including `attack_type`, `rule_id`, `client_ip`, `path`, `severity`, and `risk_score`.

### 9.2 Nginx Access Logs (File / stdout)

Standard Nginx access logs written for every request (blocked or allowed). Used for traffic volume monitoring and debugging.

---

## 10. How Administrators Manage Policies

Administrators interact only with the **admin dashboard** (Next.js). The flow for a configuration change:

```
Admin → Dashboard (Next.js)
         └─► FastAPI REST API
                ├─► Validate input (Pydantic)
                ├─► Write to PostgreSQL (source of truth)
                └─► Publish updated rule set to Redis
                          └─► Data plane reads new rules
                              on next incoming request
```

Changes are live within milliseconds of saving. No Nginx reload is required for rule changes because rules are stored in Redis, not in config files.

---

## 11. Benefits and Limitations

### Benefits

- **Zero application changes**: B5 is deployed in front of any existing application.
- **Sub-millisecond inspection overhead**: LuaJIT executes WAF logic at near-native speed inside Nginx.
- **Real-time rule updates**: Redis-based rule distribution means no restart needed.
- **Three operating modes**: Learning, Logging, and Blocking allow safe, gradual rollout.
- **Simple deployment**: A single `docker-compose up` starts the full stack.
- **Extensible**: New Lua modules, FastAPI endpoints, and dashboard pages can be added independently.

### Limitations

- **Encrypted backend traffic**: B5 cannot inspect traffic encrypted between your application and its database.
- **False positives**: Aggressive WAF rules can block legitimate requests. Always tune in Logging mode first.
- **Single proxy point of failure**: The MVP runs one OpenResty instance. Horizontal scaling requires a load balancer in front of multiple `b5-proxy` containers (see the scaling guide).
- **No L4 protection**: B5 operates at Layer 7 (HTTP). Network-level DDoS (SYN floods, UDP floods) requires a separate solution.

---

## 12. Related Documentation

| Document | Description |
|---------|-------------|
| [blueprint.md](blueprint.md) | Project vision and technology rationale |
| [structure.md](structure.md) | Repository directory structure |
| [openresty_lua_interaction.md](openresty_lua_interaction.md) | Data plane Lua pipeline deep dive |
| [fastapi_control_plane.md](fastapi_control_plane.md) | Control plane REST API reference |
| [request_lifecycle.md](request_lifecycle.md) | Full request lifecycle state diagram |
| [waf_modes.md](waf_modes.md) | Learning, Logging, and Blocking mode comparison |
| [glossary.md](glossary.md) | Core WAF terms and definitions |
