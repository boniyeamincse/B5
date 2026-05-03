# B5 WAF — FastAPI Control Plane Architecture

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

## 1. Purpose of the Control Plane

The **control plane** is the administrative layer of B5. It does not touch live traffic — that is the data plane's job. The control plane's responsibilities are:

- Manage the configuration of the WAF (rules, policies, applications, users).
- Expose a secure REST API consumed by the admin dashboard.
- Persist all configuration changes to PostgreSQL.
- Publish updated rule sets to Redis so the data plane picks them up without a restart.
- Query security event logs from OpenSearch to power reporting and analytics.

The control plane is built with **FastAPI** — an async Python web framework. FastAPI was chosen for:

- Native async/await support for non-blocking I/O.
- Automatic OpenAPI (Swagger) documentation generation from Python type hints.
- Pydantic-based request/response validation at the API boundary.
- Strong ecosystem: SQLAlchemy, Alembic, PyJWT, pytest.

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point, router registration
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Login, token refresh, logout
│   │       ├── applications.py  # Protected application management
│   │       ├── policies.py      # WAF policy management
│   │       ├── rules.py         # Security rule management
│   │       ├── events.py        # Security event log queries
│   │       ├── ip_blocklist.py  # IP blocklist management
│   │       └── users.py         # Admin user management
│   ├── core/
│   │   ├── config.py        # Environment variable settings (pydantic-settings)
│   │   ├── security.py      # Password hashing, JWT creation/verification
│   │   └── dependencies.py  # FastAPI dependency injection (current_user, db)
│   ├── models/
│   │   ├── user.py          # SQLAlchemy User model
│   │   ├── application.py   # SQLAlchemy Application model
│   │   ├── policy.py        # SQLAlchemy Policy model
│   │   ├── rule.py          # SQLAlchemy Rule model
│   │   └── audit_log.py     # SQLAlchemy AuditLog model
│   ├── schemas/
│   │   ├── auth.py          # Pydantic login/token schemas
│   │   ├── application.py   # Pydantic application schemas
│   │   ├── policy.py        # Pydantic policy schemas
│   │   ├── rule.py          # Pydantic rule schemas
│   │   └── event.py         # Pydantic event query/response schemas
│   ├── crud/
│   │   ├── applications.py  # DB CRUD for applications
│   │   ├── policies.py      # DB CRUD for policies
│   │   ├── rules.py         # DB CRUD for rules
│   │   └── users.py         # DB CRUD for users
│   └── services/
│       ├── rule_sync.py     # Publishes compiled rule sets to Redis
│       ├── opensearch.py    # OpenSearch client wrapper
│       └── ip_reputation.py # IP blocklist / reputation management
├── requirements.txt
├── Dockerfile
└── alembic/                 # Database migration scripts
```

---

## 3. REST API Design

The API follows REST conventions:

- All endpoints are prefixed with `/api/v1/`.
- Resources are plural nouns: `/applications`, `/rules`, `/policies`.
- HTTP verbs map to actions: `GET` = read, `POST` = create, `PUT` = update/replace, `PATCH` = partial update, `DELETE` = remove.
- All responses use JSON. Errors return a JSON body with `detail` explaining the problem.
- All endpoints (except `/api/v1/auth/login`) require a valid JWT Bearer token.

### Swagger UI

FastAPI auto-generates interactive API documentation at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 4. Authentication and Authorization

### 4.1 Authentication Flow (JWT)

B5 uses **JSON Web Tokens (JWT)** for stateless authentication.

```
POST /api/v1/auth/login
Body: { "username": "admin", "password": "secret" }

── FastAPI ──► Verify password hash (bcrypt) against PostgreSQL users table
            ──► If valid, generate signed JWT:
                {
                  "sub": "user_id:1",
                  "role": "admin",
                  "exp": 1746403200
                }
            ──► Return { "access_token": "eyJ...", "token_type": "bearer" }

All subsequent requests:
  Authorization: Bearer eyJ...
  ──► FastAPI verifies signature and expiry
  ──► Injects current_user into route handler via dependency injection
```

> **Security note:** JWTs are signed with a secret key stored in the `SECRET_KEY` environment variable — never hardcoded. In production, use a randomly generated 64-byte key.

### 4.2 Roles and Permissions

| Role | Permissions |
|------|------------|
| `admin` | Full access: create/edit/delete rules, policies, applications, users |
| `analyst` | Read-only access to events and dashboards; cannot modify rules |
| `operator` | Can change policy modes (block/log/learn) but cannot edit rules |

Role is embedded in the JWT payload and checked in FastAPI route handlers via a dependency.

---

## 5. Core API Endpoints

### Applications

Protected web applications or APIs registered in B5.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/applications` | List all registered applications |
| `POST` | `/api/v1/applications` | Register a new application |
| `GET` | `/api/v1/applications/{id}` | Get application details |
| `PUT` | `/api/v1/applications/{id}` | Update application config |
| `DELETE` | `/api/v1/applications/{id}` | Remove an application |

**POST /api/v1/applications — example request:**

```json
{
  "name": "My E-commerce Site",
  "domain": "shop.example.com",
  "backend_url": "http://backend-app:3000",
  "policy_id": 1,
  "ssl_enabled": true
}
```

**Response (201 Created):**

```json
{
  "id": 3,
  "name": "My E-commerce Site",
  "domain": "shop.example.com",
  "backend_url": "http://backend-app:3000",
  "policy_id": 1,
  "ssl_enabled": true,
  "created_at": "2026-05-03T10:00:00Z"
}
```

---

### Policies

A policy is a named group of rules and settings applied to one or more applications.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/policies` | List all policies |
| `POST` | `/api/v1/policies` | Create a new policy |
| `GET` | `/api/v1/policies/{id}` | Get policy with its rules |
| `PUT` | `/api/v1/policies/{id}` | Update policy name/description |
| `PUT` | `/api/v1/policies/{id}/mode` | Change policy mode (blocking/logging/learning) |
| `DELETE` | `/api/v1/policies/{id}` | Delete a policy |

**PUT /api/v1/policies/{id}/mode — example:**

```json
{
  "mode": "blocking"
}
```

Changing the mode triggers `rule_sync.py` to publish the updated policy to Redis immediately.

---

### Rules

An individual detection rule with a pattern, target field, action, and severity.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/rules` | List all rules (filterable by policy, type, severity) |
| `POST` | `/api/v1/rules` | Create a new rule |
| `GET` | `/api/v1/rules/{id}` | Get rule details |
| `PUT` | `/api/v1/rules/{id}` | Update a rule |
| `PATCH` | `/api/v1/rules/{id}/enabled` | Enable or disable a rule |
| `DELETE` | `/api/v1/rules/{id}` | Delete a rule |

**POST /api/v1/rules — example:**

```json
{
  "policy_id": 1,
  "name": "SQLi Union Select",
  "description": "Detects UNION SELECT SQL injection attempts",
  "pattern": "(?i)union[\\s\\+]+select",
  "target": "uri",
  "action": "block",
  "severity": "critical",
  "enabled": true
}
```

`target` can be: `uri`, `query`, `body`, `header`, `cookie`, `method`.

---

### Security Events

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/events` | Query security events (filter by IP, attack type, date range) |
| `GET` | `/api/v1/events/{id}` | Get full detail of a single event |
| `GET` | `/api/v1/events/stats` | Aggregated stats: events by type, top IPs, hourly volume |

**GET /api/v1/events — example query params:**

```
GET /api/v1/events?attack_type=sqli&severity=critical&from=2026-05-01&to=2026-05-03&limit=50
```

Events are read from **OpenSearch**, not PostgreSQL, because they can number in the millions.

---

### IP Blocklist

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/ip-blocklist` | List manually blocked IPs |
| `POST` | `/api/v1/ip-blocklist` | Add an IP or CIDR range to the blocklist |
| `DELETE` | `/api/v1/ip-blocklist/{ip}` | Remove an IP from the blocklist |

**POST /api/v1/ip-blocklist — example:**

```json
{
  "ip": "203.0.113.42",
  "reason": "Repeated SQL injection attempts",
  "ttl_seconds": 86400
}
```

This writes `block:203.0.113.42` to Redis with a 24-hour TTL, immediately enforced by the data plane.

---

## 6. Policy and Rule Management Flow

```
Admin opens dashboard
  └─► GET /api/v1/policies  ──► FastAPI reads from PostgreSQL
                             ──► Returns policy list to dashboard

Admin creates a new rule
  └─► POST /api/v1/rules
        ├─► Pydantic validates schema (pattern, target, action, severity)
        ├─► SQLAlchemy writes rule to PostgreSQL
        ├─► rule_sync.py compiles all rules for the policy into JSON
        ├─► Publishes to Redis key: b5:rules:policy:{policy_id}
        └─► Returns 201 Created

On next request, data plane Lua script:
  └─► Reads b5:rules:policy:{policy_id} from Redis
  └─► Applies new rule — no restart required
```

---

## 7. Communication with PostgreSQL, Redis, and OpenSearch

### PostgreSQL

FastAPI connects via **SQLAlchemy** (async mode with `asyncpg` driver).

```python
# core/config.py
DATABASE_URL = "postgresql+asyncpg://b5admin:b5password@b5-postgres:5432/b5"
```

All reads and writes go through SQLAlchemy ORM models. Raw SQL is avoided to prevent SQL injection vulnerabilities.

### Redis

FastAPI connects via **`redis-py`** (async mode):

```python
import redis.asyncio as redis

r = redis.from_url("redis://b5-redis:6379")
await r.set(f"b5:rules:policy:{policy_id}", json.dumps(rules), ex=3600)
```

Redis is used for:
- Publishing compiled rule sets to the data plane.
- Writing temporary IP blocklist entries with TTL.
- Caching session tokens.

### OpenSearch

FastAPI uses the **`opensearch-py`** client:

```python
from opensearchpy import AsyncOpenSearch

client = AsyncOpenSearch(hosts=["http://b5-opensearch:9200"])
response = await client.search(index="b5-events-*", body=query)
```

Events are written by the data plane (OpenResty) directly and only **read** by the control plane for reporting.

---

## 8. Audit Logging

Every state-changing API call (create, update, delete) is recorded in the PostgreSQL `audit_log` table.

**Fields recorded:**

| Field | Description |
|-------|-------------|
| `id` | Unique audit record ID |
| `user_id` | Admin user who made the change |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `MODE_CHANGE` |
| `resource_type` | `rule`, `policy`, `application`, `user` |
| `resource_id` | ID of the affected record |
| `previous_value` | JSON snapshot of the record before change |
| `new_value` | JSON snapshot of the record after change |
| `ip_address` | IP of the admin user |
| `timestamp` | UTC timestamp |

This provides a full change history for compliance and incident investigation.

---

## 9. How Configuration Changes Reach the Data Plane

The **push model**: whenever a rule or policy changes in PostgreSQL, FastAPI immediately pushes the compiled result to Redis. No polling, no scheduled jobs, no Nginx reload.

```
FastAPI (after DB write)
  └─► services/rule_sync.py
        ├─► Query all enabled rules for policy {id} from PostgreSQL
        ├─► Serialize to compact JSON array
        ├─► redis.set("b5:rules:policy:{id}", json_rules, ex=3600)
        └─► redis.publish("b5:rules:updated", str(policy_id))
              └─► (Optional) Trigger Lua cosocket listener to
                  invalidate worker-local rule cache
```

The data plane Lua script reads `b5:rules:policy:{id}` from Redis on each request (or from a worker-local cache invalidated by the publish event).

---

## 10. Environment Variables

All sensitive configuration is passed via environment variables. Never hardcode credentials.

| Variable | Description | Example |
|---------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection URL | `redis://b5-redis:6379` |
| `OPENSEARCH_URL` | OpenSearch endpoint | `http://b5-opensearch:9200` |
| `SECRET_KEY` | JWT signing secret (64 bytes min) | Random hex string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | `60` |
| `CORS_ORIGINS` | Allowed origins for the API | `http://localhost:3000` |

---

## 11. Related Documentation

| Document | Description |
|---------|-------------|
| [architecture_overview.md](architecture_overview.md) | Full system architecture |
| [postgresql_configuration_storage.md](postgresql_configuration_storage.md) | PostgreSQL schema reference |
| [redis_rate_limiting.md](redis_rate_limiting.md) | Redis key schema and rate limiting |
| [logging_pipeline.md](logging_pipeline.md) | Security event logging pipeline |
