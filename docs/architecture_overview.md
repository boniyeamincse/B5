# B5 WAF — Architecture Overview

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Status:** Living Document

---

## 1. Introduction

B5 is a modern Web Application Firewall (WAF) built on a **reverse-proxy model**. It intercepts every HTTP/HTTPS request destined for a protected backend application, applies a multi-layer security inspection pipeline, and either forwards clean traffic or terminates malicious requests — all before a single byte reaches the application server.

This document describes the high-level architecture, component responsibilities, communication paths, and the lifecycle of a request through the B5 system.

---

## 2. The Reverse-Proxy Model

B5 operates as a **transparent inline proxy**. From the client's perspective, it is simply the web server. From the backend application's perspective, it is just another request source. The WAF logic is entirely invisible to both parties.

```
┌──────────────┐        ┌─────────────────────────────────┐        ┌──────────────────┐
│              │  HTTP  │         B5 WAF Proxy             │  HTTP  │                  │
│   Internet   │ ──────►│  (OpenResty / Nginx + Lua)       │ ──────►│  Backend App     │
│   Client     │        │                                  │        │  (Any web server)│
│              │◄──────  │  • IP check  • Rule scan        │◄──────  │                  │
└──────────────┘        │  • Rate limit • Body inspect     │        └──────────────────┘
                        └─────────────────────────────────┘
                                        │  ▲
                         Rule updates   │  │ Status / Config
                                        ▼  │
                        ┌───────────────────────────────┐
                        │  Control Plane (FastAPI)       │
                        │  • Rule management API         │
                        │  • Policy engine               │
                        │  • Auth / Admin API            │
                        └───────────────────────────────┘
                                        │  ▲
                           Reads data   │  │ Writes data
                                        ▼  │
                        ┌───────────────────────────────┐
                        │  PostgreSQL + Redis            │
                        │  • Persistent rule store (PG) │
                        │  • Fast in-memory cache (Redis)│
                        └───────────────────────────────┘
                                        │
                             Log events │
                                        ▼
                        ┌───────────────────────────────┐
                        │  OpenSearch / Elasticsearch    │
                        │  • Security event logs         │
                        │  • Analytics & Reporting       │
                        └───────────────────────────────┘
                                        ▲
                           Query logs   │
                        ┌───────────────────────────────┐
                        │  Frontend Dashboard (Next.js)  │
                        │  • Real-time metrics           │
                        │  • Rule management UI          │
                        │  • Incident investigation      │
                        └───────────────────────────────┘
```

---

## 3. System Components

B5 is composed of five distinct layers, each with a single, well-defined responsibility.

### 3.1 Data Plane — OpenResty (Nginx + Lua)

| Attribute   | Value                                          |
|-------------|------------------------------------------------|
| **Image**   | `openresty/openresty:bullseye`                 |
| **Ports**   | `80` (HTTP), `443` (HTTPS)                     |
| **Container** | `b5-proxy`                                   |

The **data plane** is the performance-critical component. It handles every incoming connection and executes the WAF inspection logic at the Nginx worker level using embedded Lua scripts.

**Key files:**

| File | Purpose |
|------|---------|
| `proxy/conf/nginx.conf` | Main Nginx configuration (workers, logging format, includes) |
| `proxy/conf/b5.conf` | Virtual host definition; invokes the Lua inspection pipeline via `access_by_lua_file` |
| `proxy/lua/init.lua` | Runs **once at Nginx startup**; loads global `B5_CONFIG` (mode, Redis address, rule patterns) into the shared dictionary |
| `proxy/lua/access.lua` | Runs **on every request**; executes all security checks and either blocks or passes the request |

**How it works at runtime:**

1. Nginx receives a request and enters the `access` phase.
2. `access_by_lua_file lua/access.lua` is invoked.
3. The Lua script reads the globally-loaded `B5_CONFIG` (set during `init.lua`) for rule patterns and configuration.
4. Checks are executed against the request (URI, headers, body).
5. On a rule match → `ngx.exit(ngx.HTTP_FORBIDDEN)` terminates the request and returns a 403 response.
6. If all checks pass → Nginx continues to the `proxy_pass` directive and forwards the request to the upstream backend.

### 3.2 Control Plane — FastAPI (Python)

| Attribute   | Value                     |
|-------------|---------------------------|
| **Framework** | FastAPI (async Python)  |
| **Container** | `b5-backend`            |

The **control plane** is the brain of the WAF configuration layer. It exposes a REST API consumed by the dashboard and is responsible for managing the persistent state of all WAF rules and policies stored in PostgreSQL. It also handles publishing rule changes to Redis so the data plane can pick them up without restarting.

**Key responsibilities:**

- CRUD operations for WAF rules, policies, and application definitions.
- JWT-based authentication for all admin operations.
- Publishing updated rule sets to Redis for real-time consumption by Lua scripts.
- Aggregating logs from OpenSearch to serve analytics to the dashboard.

**Directory structure:**

```
backend/app/
├── main.py         # FastAPI entry point
├── api/            # Route handlers (/rules, /policies, /auth, /logs)
├── core/           # Configuration, security utilities, JWT handling
├── models/         # SQLAlchemy ORM models (User, Rule, Policy)
├── schemas/        # Pydantic request/response validation schemas
├── crud/           # Database CRUD logic (decoupled from routes)
└── services/       # Business logic: rule syncing, reporting
```

### 3.3 Persistent Storage — PostgreSQL

| Attribute   | Value                      |
|-------------|----------------------------|
| **Image**   | `postgres:15-alpine`       |
| **Container** | `b5-postgres`            |
| **Database** | `b5`                      |
| **Credentials** | `b5admin` / `b5password` (override in production via environment variables) |

PostgreSQL is the **system of record** for all WAF configuration. The `database/init.sql` script initializes the schema on first launch.

**Core entities stored:**

- `users` — Admin accounts with hashed passwords and roles.
- `rules` — Individual WAF detection rules (pattern, action, severity, target field).
- `policies` — Groups of rules assigned to protected applications.
- `applications` — Registered upstream applications with their proxy routing config.
- `audit_log` — Record of all configuration changes made via the API.

### 3.4 In-Memory Cache — Redis

| Attribute   | Value              |
|-------------|-------------------|
| **Image**   | `redis:alpine`    |
| **Container** | `b5-redis`      |
| **Port**    | `6379`            |

Redis serves as the **high-speed shared memory** between the control plane and the data plane. Because Nginx Lua scripts cannot perform a PostgreSQL query on every request without unacceptable latency, all hot-path data is replicated into Redis.

**What is stored in Redis:**

| Key Type | Purpose |
|----------|---------|
| Rule sets | Compiled WAF rules published by FastAPI; read by Lua on each request |
| Rate limit counters | Sliding-window counters per IP address and per route |
| IP reputation cache | Blocked/allowed IP status; TTL-based expiration |
| Session tokens | Short-lived admin session data |

### 3.5 Log Store — OpenSearch / Elasticsearch

The **log store** receives asynchronous security event logs generated by the Lua `access.lua` script. Logs are structured as JSON and include the attack type, matched pattern, client IP, URI, timestamp, and risk score.

**Why asynchronous:** Logging is never allowed to block the request inspection pipeline. Events are buffered and shipped without adding latency to the proxied request.

### 3.6 Admin Dashboard — Next.js (React + Tailwind CSS)

| Attribute   | Value              |
|-------------|-------------------|
| **Framework** | Next.js (App Router) |
| **Container** | `b5-frontend`    |

The dashboard is a single-page application that communicates exclusively with the FastAPI control plane. It provides:

- Real-time security event feed.
- Rule and policy management UI.
- Traffic analytics and risk scoring dashboards.
- Incident investigation with log search.

---

## 4. Request Lifecycle

The following describes the complete path of a single HTTP request through the B5 system.

```
Client
  │
  │  HTTP GET /search?q=1' OR '1'='1
  ▼
[b5-proxy] — Nginx enters access phase
  │
  ├─► init.lua (already loaded at startup)
  │     └─ B5_CONFIG available in global scope
  │
  ├─► access.lua executes
  │     │
  │     ├─ 1. Unescape URI
  │     ├─ 2. Match URI against SQL Injection patterns
  │     │       └─ MATCH FOUND: "'.*or.*'.*="
  │     │
  │     └─ ngx.exit(403) ──────────────────────────────►  Client receives 403 "Access Denied"
  │                                                        Event logged to OpenSearch
  │
  │  (Clean request path — no pattern match)
  │
  ├─► access.lua: all checks pass
  │
  ├─► proxy_pass http://dummy-app:80
  │
  ▼
[dummy-app] — Backend processes request
  │
  ▼
Response returned to client through proxy
```

### Mode Behavior

B5 operates in one of three modes, configured in `init.lua` via `B5_CONFIG.mode`:

| Mode | Behavior |
|------|---------|
| `"blocking"` | Malicious requests are **terminated** (HTTP 403). Events are logged. |
| `"logging"` | Requests **pass through** but events are logged. Useful for tuning without blocking real traffic. |
| `"learning"` | Requests pass through. The system observes traffic patterns to auto-generate suggested rules. |

---

## 5. Network Topology

All B5 containers communicate over a dedicated Docker bridge network named `b5-network`. No direct external access is permitted to internal services (Redis, PostgreSQL, the backend app) except via the defined port mappings.

```
External Network (Internet)
  │
  ├── :80  ──►  b5-proxy
  └── :443 ──►  b5-proxy
                    │
                    └──── b5-network (internal) ────────┐
                              │                         │
                         b5-redis:6379           b5-postgres:5432
                              │                         │
                         b5-backend:8000          dummy-app:80
                              │
                         b5-frontend:3000
```

> **Security Note:** In production, `b5-backend`, `b5-redis`, and `b5-postgres` port mappings should be removed from `docker-compose.yml` to prevent direct external access. Only `b5-proxy` (port 80/443) should be publicly exposed.

---

## 6. Data Plane Deep Dive — The Lua Pipeline

The Lua pipeline is the most performance-sensitive part of B5. It runs synchronously in the Nginx worker process with zero external process overhead.

### Startup Phase (`init.lua`)

Executed once when OpenResty starts. Loads all static configuration (detection patterns, Redis connection details, operating mode) into a Lua global table `_G.B5_CONFIG`. This avoids repeated file I/O or Redis reads on every request for configuration that rarely changes.

### Per-Request Phase (`access.lua`)

Executed for every proxied request during Nginx's `access` phase — before any response is generated.

**Current inspection steps:**

1. **URI Inspection**
   - URI is unescaped with `ngx.unescape_uri()` to defeat double-encoding evasion techniques.
   - The decoded URI is matched against all SQL Injection patterns.
   - The decoded URI is matched against all XSS patterns.
   - On any match: log the event and call `ngx.exit(ngx.HTTP_FORBIDDEN)`.

2. **Pass-through**
   - If no rule matches, the request proceeds normally to `proxy_pass`.

**Planned inspection steps (roadmap):**

- Request header inspection (User-Agent, Referer, Cookie).
- Request body inspection for POST/PUT payloads.
- Redis-based IP reputation check.
- Redis-based sliding-window rate limit check.
- Path traversal and command injection pattern matching.

---

## 7. Control Plane Deep Dive — Rule Lifecycle

When an administrator creates or modifies a rule via the dashboard:

```
Dashboard (Next.js)
  └─► POST /api/rules  ──►  FastAPI
                                ├─► Validate with Pydantic schema
                                ├─► Write to PostgreSQL (rules table)
                                └─► Publish updated rule set to Redis
                                          └─► Lua scripts read from Redis
                                              on next request (or on reload)
```

This **push model** means rule changes propagate to the data plane within milliseconds without requiring an Nginx reload.

---

## 8. Deployment Model

B5 is packaged as a **Docker Compose application** for both local development and MVP production deployment.

```yaml
# docker-compose.yml service summary
services:
  b5-proxy      # OpenResty — Data plane (ports 80, 443)
  b5-redis      # Redis — Cache and rate limit store (port 6379)
  b5-postgres   # PostgreSQL — Persistent config store (port 5432)
  dummy-app     # Sample Nginx backend — Testing target (internal only)
```

All services share the `b5-network` bridge network. PostgreSQL data is persisted via the `b5-db-data` named volume, ensuring configuration survives container restarts.

---

## 9. Key Design Decisions

| Decision | Rationale |
|---------|----------|
| **OpenResty over standalone Nginx** | Embeds a full LuaJIT runtime inside Nginx workers, enabling programmable request inspection at wire speed with no IPC overhead. |
| **Lua for the hot path** | LuaJIT is JIT-compiled; regex operations via `ngx.re.match` use the PCRE library which is already loaded by Nginx. Latency impact per request is sub-millisecond. |
| **Redis for rule caching** | Eliminates PostgreSQL round-trips from the hot path. A single Redis GET is ~0.1ms; a PostgreSQL query is ~1-5ms under load. |
| **FastAPI for the control plane** | Async I/O handles concurrent dashboard users efficiently. Pydantic enforces schema validation at the API boundary, preventing malformed rules from reaching the data plane. |
| **Async logging** | Security event logging is non-blocking. A blocked request is terminated and the log event is queued independently so that logging latency never affects the 403 response time. |
| **Docker Compose** | Reproducible environments from development to production with a single `docker-compose up` command, lowering operational complexity. |

---

## 10. Related Documentation

| Document | Description |
|---------|-------------|
| [blueprint.md](blueprint.md) | Original project vision and technology stack rationale |
| [structure.md](structure.md) | Full repository directory and file structure |
| `openresty_lua_interaction.md` *(planned)* | Deep dive into OpenResty and Lua data plane internals |
| `control_plane_architecture.md` *(planned)* | FastAPI control plane design and API reference |
| `request_lifecycle_diagram.md` *(planned)* | Detailed state diagram for the request lifecycle |
