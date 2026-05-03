# B5 WAF — PostgreSQL Configuration Storage

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

## 1. Role of PostgreSQL in B5

PostgreSQL is the **system of record** for all B5 configuration. It stores everything that administrators manage: which applications are protected, what security rules apply to them, which users can log in to the dashboard, and a full history of every configuration change.

**What PostgreSQL stores:**

- Registered applications and their backend server configuration.
- WAF policies (groups of rules + operating mode).
- Individual security rules (patterns, targets, actions, severity).
- Virtual host to application mappings.
- Admin users, password hashes, and roles.
- Audit log of all configuration changes.
- System-level settings.

**What PostgreSQL does NOT store:**

- Live traffic data — that goes to OpenSearch.
- Rate limit counters — those live in Redis.
- IP blocklists that need millisecond lookup — those are cached in Redis.

The data plane (OpenResty/Lua) never queries PostgreSQL directly during request processing. All hot-path data is replicated into Redis by the control plane (FastAPI) after each configuration change.

---

## 2. Database Schema

### 2.1 `users`

Stores admin user accounts.

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,         -- bcrypt hash, never plaintext
    role            VARCHAR(50) NOT NULL DEFAULT 'analyst',  -- admin | analyst | operator
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- Passwords are hashed with **bcrypt** (cost factor ≥ 12). Plaintext passwords are never stored.
- `role` is an application-level enum enforced by FastAPI, not a PostgreSQL enum, to make it easier to add roles without migrations.
- `is_active = FALSE` disables a user without deleting their record (preserves audit history).

---

### 2.2 `applications`

Each row represents one web application or API protected by B5.

```sql
CREATE TABLE applications (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) UNIQUE NOT NULL,  -- e.g. shop.example.com
    backend_url     VARCHAR(500) NOT NULL,          -- e.g. http://backend:3000
    policy_id       INTEGER REFERENCES policies(id) ON DELETE SET NULL,
    ssl_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `domain` is the `Host` header value that B5 uses to route incoming requests to the correct backend.
- `backend_url` is the upstream address passed to `proxy_pass` in OpenResty.
- `policy_id` links to the WAF policy applied to this application. If the policy is deleted, this becomes NULL and the application falls back to default-allow behaviour.

---

### 2.3 `policies`

A policy is a named container for WAF rules, with an operating mode.

```sql
CREATE TABLE policies (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    mode            VARCHAR(50) NOT NULL DEFAULT 'logging', -- learning | logging | blocking
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,          -- one default policy allowed
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Modes:**

| Mode | Behaviour |
|------|---------|
| `learning` | Traffic passes; patterns are observed and suggested rules are generated |
| `logging` | Violations are logged but traffic is not blocked |
| `blocking` | Violations result in a 403 response |

---

### 2.4 `rules`

Individual WAF detection rules. Each rule belongs to a policy.

```sql
CREATE TABLE rules (
    id              SERIAL PRIMARY KEY,
    policy_id       INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    pattern         TEXT NOT NULL,       -- PCRE regex pattern
    target          VARCHAR(50) NOT NULL, -- uri | query | body | header | cookie | method
    action          VARCHAR(50) NOT NULL DEFAULT 'block', -- block | log | allow
    severity        VARCHAR(50) NOT NULL DEFAULT 'medium', -- info | low | medium | high | critical
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Field descriptions:**

| Field | Description |
|-------|-------------|
| `pattern` | PCRE-compatible regular expression tested against the `target` field of each request |
| `target` | Which part of the request this rule inspects |
| `action` | What to do when the pattern matches |
| `severity` | Used for risk scoring and dashboard filtering |
| `enabled` | Rules can be disabled without deletion for testing/rollback |

**Example rows:**

| name | pattern | target | action | severity |
|------|---------|--------|--------|---------|
| SQLi Union Select | `(?i)union[\s\+]+select` | `uri` | block | critical |
| XSS Script Tag | `(?i)<script` | `body` | block | high |
| Path Traversal | `(?i)(\.\./)` | `uri` | block | high |
| Admin Panel Probe | `(?i)/admin/.*` | `uri` | log | low |

---

### 2.5 `ip_blocklist`

Persistent IP blocks managed by administrators. Short-lived blocks are stored only in Redis; permanent blocks are stored here.

```sql
CREATE TABLE ip_blocklist (
    id              SERIAL PRIMARY KEY,
    ip_address      INET NOT NULL,       -- supports IPv4 and IPv6 (CIDR notation allowed)
    reason          TEXT,
    blocked_by      INTEGER REFERENCES users(id),
    expires_at      TIMESTAMPTZ,         -- NULL means permanent
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ip_blocklist_ip ON ip_blocklist(ip_address);
```

---

### 2.6 `audit_log`

A tamper-evident record of every configuration change. This table is append-only — records are never updated or deleted.

```sql
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,   -- CREATE | UPDATE | DELETE | MODE_CHANGE | LOGIN
    resource_type   VARCHAR(100) NOT NULL,  -- rule | policy | application | user | ip_blocklist
    resource_id     INTEGER,
    previous_value  JSONB,                  -- snapshot before change
    new_value       JSONB,                  -- snapshot after change
    ip_address      INET,                   -- admin's IP address
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id   ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource  ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created   ON audit_log(created_at DESC);
```

**Notes:**
- `previous_value` and `new_value` store full JSON snapshots so administrators can see exactly what changed.
- The `BIGSERIAL` primary key ensures the log can hold billions of records.
- In a compliance environment, access to `DELETE` on this table should be restricted even to DBAs.

---

### 2.7 `system_settings`

Key-value store for global system configuration.

```sql
CREATE TABLE system_settings (
    key         VARCHAR(255) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_by  INTEGER REFERENCES users(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Example settings:**

| key | value | description |
|-----|-------|-------------|
| `default_rate_limit_rps` | `100` | Default requests/second per IP |
| `alert_email` | `security@example.com` | Email for critical alerts |
| `max_body_size_bytes` | `1048576` | Max request body to inspect (1 MB) |
| `risk_score_block_threshold` | `80` | Auto-block if risk score exceeds this |

---

## 3. Entity Relationship Diagram

```
users ──────────────────┐
  │ created_by          │
  ▼                     │
applications ──────────►policies ──────────►rules
  (policy_id FK)         (id PK)             (policy_id FK)

users ──► audit_log
users ──► ip_blocklist
```

**Relationships:**

- One **policy** has many **rules** (1:N, `ON DELETE CASCADE`).
- One **application** is linked to one **policy** (N:1).
- One **user** creates many **applications**, **rules**, **audit_log** entries.
- **system_settings** has no foreign keys — it is standalone.

---

## 4. Indexing Strategy

```sql
-- Fast lookup of rules by policy (data plane publish query)
CREATE INDEX idx_rules_policy_id_enabled ON rules(policy_id, enabled);

-- Fast lookup of applications by domain (routing)
CREATE UNIQUE INDEX idx_applications_domain ON applications(domain);

-- Audit log queries by date range
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- IP blocklist INET range queries
CREATE INDEX idx_ip_blocklist_ip ON ip_blocklist USING gist (ip_address inet_ops);
```

---

## 5. Initialisation

The `database/init.sql` file runs automatically when the `b5-postgres` Docker container starts for the first time. It creates all tables and inserts the default admin user (with a bcrypt-hashed password).

```sql
-- database/init.sql (excerpt)
CREATE TABLE IF NOT EXISTS users ( ... );
CREATE TABLE IF NOT EXISTS policies ( ... );
CREATE TABLE IF NOT EXISTS rules ( ... );

-- Default admin user (password: change-me-on-first-login)
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@localhost',
    '$2b$12$...bcrypt_hash_of_default_password...',
    'admin'
) ON CONFLICT DO NOTHING;
```

> **Security note:** Change the default admin password immediately after first deployment.

---

## 6. Backup and Restore

```bash
# Backup
docker exec b5-postgres pg_dump -U b5admin b5 > b5_backup_$(date +%F).sql

# Restore
docker exec -i b5-postgres psql -U b5admin b5 < b5_backup_2026-05-03.sql
```

---

## 7. Related Documentation

| Document | Description |
|---------|-------------|
| [architecture_overview.md](architecture_overview.md) | Full system architecture |
| [fastapi_control_plane.md](fastapi_control_plane.md) | How FastAPI reads/writes this schema |
| [redis_rate_limiting.md](redis_rate_limiting.md) | What is cached in Redis vs stored in PostgreSQL |
