# B5 WAF — Quick Start Guide (Docker Compose)

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Time to complete:** ~10 minutes  
**Related:** [prerequisites.md](prerequisites.md), [architecture_overview.md](architecture_overview.md)

---

## Overview

This guide gets B5 WAF running on your local machine using Docker Compose. By the end you will have:

- The B5 proxy (OpenResty) running on port 80, protecting a test application.
- PostgreSQL storing WAF rules and configuration.
- Redis handling rate limiting and caching.
- A dummy backend application to send test traffic through.
- Verified that B5 blocks a real SQL injection attack.

---

## Prerequisites

You need the following installed before starting:

| Requirement | Minimum Version | Check |
|-------------|----------------|-------|
| Docker Engine | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ (included in Docker Desktop) | `docker compose version` |
| Git | Any recent version | `git --version` |
| Free ports | 80, 443, 5432, 6379 | See [Checking Port Availability](#checking-port-availability) |

> **Docker Desktop users (macOS / Windows):** Docker Compose V2 is included. No separate install needed.

> **Linux users:** Install Docker Engine from [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) and the Compose plugin with `sudo apt install docker-compose-plugin` (Debian/Ubuntu).

### Checking Port Availability

Ports 80 and 443 are required by `b5-proxy`. If another web server is using them:

```bash
# Check what is using port 80
sudo lsof -i :80
sudo lsof -i :443
```

If Apache or Nginx is running locally, stop it first:

```bash
sudo systemctl stop nginx    # or apache2
```

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/b5.git
cd b5
```

> If you are working from an existing local directory, just `cd` into it:
> ```bash
> cd /home/boni/Desktop/B5
> ```

Verify the directory structure looks like this:

```
B5/
├── docker-compose.yml
├── database/
│   └── init.sql
├── proxy/
│   ├── conf/
│   │   ├── nginx.conf
│   │   └── b5.conf
│   └── lua/
│       ├── init.lua
│       └── access.lua
└── dummy-app/
    └── index.html
```

---

## Step 2 — Review the Default Configuration

Open `docker-compose.yml` to understand what will be started:

```yaml
services:
  b5-proxy:      # OpenResty WAF — listens on :80 and :443
  b5-redis:      # Redis — rate limiting and rule cache
  b5-postgres:   # PostgreSQL — WAF configuration storage
  dummy-app:     # Sample Nginx backend — the "protected application"
```

All four services share an internal Docker bridge network (`b5-network`). Only `b5-proxy` is reachable from outside.

> **Default credentials (local development only):**
> - PostgreSQL: user `b5admin`, password `b5password`, database `b5`
> - These are defined in `docker-compose.yml` under `b5-postgres.environment`
> - **Change these before any internet-facing deployment**

---

## Step 3 — Start the Stack

From the project root directory, run:

```bash
docker compose up -d
```

The `-d` flag runs all containers in the background (detached mode).

**First-run download time:** Docker will pull images on the first run. Approximate sizes:

| Image | Size |
|-------|------|
| `openresty/openresty:bullseye` | ~180 MB |
| `redis:alpine` | ~12 MB |
| `postgres:15-alpine` | ~80 MB |
| `nginx:alpine` | ~12 MB |

Subsequent starts use cached images and take under 5 seconds.

---

## Step 4 — Verify All Containers Are Running

```bash
docker compose ps
```

Expected output:

```
NAME          IMAGE                          STATUS          PORTS
b5-proxy      openresty/openresty:bullseye   Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
b5-redis      redis:alpine                   Up              0.0.0.0:6379->6379/tcp
b5-postgres   postgres:15-alpine             Up              0.0.0.0:5432->5432/tcp
dummy-app     nginx:alpine                   Up              80/tcp
```

All four containers should show `Up`. If any show `Exiting` or `Restarting`, see [Troubleshooting](#troubleshooting).

---

## Step 5 — Verify the Proxy Is Serving Traffic

Open a browser and navigate to:

```
http://localhost
```

You should see the **B5 dummy test application**:

```
Welcome to the Protected App
If you are seeing this, the B5 WAF allowed your request through.
```

This page is served by `dummy-app` (a plain Nginx container) through the B5 proxy. B5 inspected your request, found no threats, and forwarded it.

Or verify with curl:

```bash
curl -s http://localhost | grep "Welcome"
```

Expected:

```html
<h1>Welcome to the Protected App</h1>
```

---

## Step 6 — Test WAF Blocking (SQL Injection)

Send a request containing a SQL injection payload in the URL:

```bash
curl -v "http://localhost/?id=1'+UNION+SELECT+username,password+FROM+users--"
```

B5 should detect the `UNION SELECT` pattern and return:

```
< HTTP/1.1 403 Forbidden
...
<h1>Access Denied</h1>
<p>Your request has been blocked by the B5 Web Application Firewall.</p>
```

**What happened:**

1. OpenResty received the request and called `access.lua`.
2. The URI was URL-decoded: `1' UNION SELECT username,password FROM users--`.
3. The pattern `(?i)union.*select` matched.
4. `ngx.exit(403)` was called — the dummy-app never saw the request.

---

## Step 7 — Test WAF Blocking (XSS)

```bash
curl -v "http://localhost/?q=<script>alert(1)</script>"
```

Expected response: **HTTP 403 Forbidden**

The pattern `(?i)<script` matched the `<script>` tag in the query string.

---

## Step 8 — View Real-Time WAF Logs

Watch the B5 proxy logs in real time:

```bash
docker compose logs -f b5-proxy
```

After running the SQLi test above, you should see a line like:

```
b5-proxy  | 2026/05/03 10:22:01 [warn] 7#7: *3 [B5 WAF Block] Type: SQL Injection,
           IP: 172.18.0.1, URI: /?id=1'+UNION+SELECT+username,password+FROM+users--,
           Detail: Matched pattern: (?i)union.*select
```

Press `Ctrl+C` to stop following the logs.

To view logs for other services:

```bash
docker compose logs b5-redis       # Redis logs
docker compose logs b5-postgres    # PostgreSQL startup and query logs
docker compose logs dummy-app      # Backend application logs
```

---

## Step 9 — Connect to PostgreSQL (Optional)

To inspect the WAF rules and initial schema:

```bash
docker exec -it b5-postgres psql -U b5admin -d b5
```

Useful queries:

```sql
-- List all WAF rules
SELECT id, name, type, pattern, action, enabled FROM rules;

-- List admin users
SELECT id, username, created_at FROM users;

-- Exit
\q
```

---

## Step 10 — Connect to Redis (Optional)

To inspect what is stored in Redis:

```bash
docker exec -it b5-redis redis-cli
```

Useful commands:

```
# List all keys
KEYS *

# Check if a block entry exists for an IP
GET block:203.0.113.42

# Check rate limit counters
KEYS rate:*

# Exit
quit
```

---

## Stopping the Stack

To stop all containers without removing data:

```bash
docker compose stop
```

To stop and remove containers (PostgreSQL data is preserved in the `b5-db-data` volume):

```bash
docker compose down
```

To stop, remove containers, **and delete all data** (full reset):

```bash
docker compose down -v
```

> **Warning:** `docker compose down -v` deletes the `b5-db-data` volume. All PostgreSQL data (rules, users, audit logs) will be lost. The database will be re-initialised from `database/init.sql` on the next start.

---

## Quick Reference — Useful Commands

| Task | Command |
|------|---------|
| Start all services | `docker compose up -d` |
| Stop all services | `docker compose down` |
| Check container status | `docker compose ps` |
| View proxy logs (live) | `docker compose logs -f b5-proxy` |
| Restart the proxy only | `docker compose restart b5-proxy` |
| Connect to PostgreSQL | `docker exec -it b5-postgres psql -U b5admin -d b5` |
| Connect to Redis | `docker exec -it b5-redis redis-cli` |
| Full reset (delete data) | `docker compose down -v && docker compose up -d` |
| Test clean request | `curl http://localhost` |
| Test SQLi block | `curl "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"` |
| Test XSS block | `curl "http://localhost/?q=<script>alert(1)</script>"` |

---

## Current Stack Limitations (MVP)

The current Docker Compose setup is an **MVP configuration** intended for local development and testing. Be aware of these limitations before using it in any public environment:

| Limitation | Detail |
|-----------|--------|
| No HTTPS | SSL/TLS is not configured in the default setup. See task #23 for SSL configuration. |
| Default credentials | PostgreSQL uses `b5admin`/`b5password`. Change before any network-accessible deployment. |
| No backend authentication | The control plane API (FastAPI) is not included in the current `docker-compose.yml`. Rules are managed directly via PostgreSQL. |
| No OpenSearch | Log analytics require an OpenSearch container. Add it to `docker-compose.yml` for full logging support. |
| Single proxy instance | No horizontal scaling. One `b5-proxy` container handles all traffic. |

---

## Troubleshooting

### Container exits immediately after starting

```bash
docker compose logs b5-proxy
```

Common causes:
- **Port 80 already in use**: Stop the local web server (`sudo systemctl stop nginx`) or change the port in `docker-compose.yml`.
- **Lua script syntax error**: Check `proxy/lua/init.lua` and `proxy/lua/access.lua` for syntax issues.
- **Missing volume mount**: Ensure `proxy/conf/` and `proxy/lua/` directories exist with their files.

### `b5-postgres` keeps restarting

```bash
docker compose logs b5-postgres
```

Common causes:
- **Port 5432 already in use**: A local PostgreSQL instance may be running. Stop it with `sudo systemctl stop postgresql` or change the port mapping in `docker-compose.yml`.
- **Corrupt data volume**: Run `docker compose down -v` to reset.

### `curl http://localhost` returns connection refused

- Check that `b5-proxy` is running: `docker compose ps`
- Check that port 80 is not blocked by a firewall: `sudo ufw status`
- On Linux, you may need `sudo` to bind port 80 if running Docker without rootless mode.

### WAF is not blocking the test attack

- Confirm the container is running: `docker compose ps`
- Check the Lua init script loaded correctly: `docker compose logs b5-proxy | grep "B5 WAF initialized"`
- Verify the pattern is in `proxy/lua/init.lua` under `sql_patterns`.
- Restart the proxy to force a reload: `docker compose restart b5-proxy`

---

## Next Steps

| Task | Guide |
|------|-------|
| Set up prerequisites properly | [prerequisites.md](prerequisites.md) |
| Configure SSL/TLS | Task #23 — `ssl_tls_configuration.md` *(planned)* |
| Add B5 in front of a real application | Task #15 — `nginx_integration.md` *(planned)* |
| Deploy to an Ubuntu production server | Task #13 — `ubuntu_install.md` *(planned)* |
| Understand the full architecture | [architecture_overview.md](architecture_overview.md) |
| Learn about WAF operating modes | [waf_modes.md](waf_modes.md) |
