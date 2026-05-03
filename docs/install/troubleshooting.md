# B5 WAF — Installation Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [quickstart.md](quickstart.md), [ubuntu_install.md](ubuntu_install.md), [prerequisites.md](prerequisites.md)

---

## Overview

This guide covers the most common errors encountered when installing and starting B5 WAF, with step-by-step diagnosis and resolution for each.

---

## Quick Diagnosis Checklist

Before diving into specific errors, run through this checklist:

```bash
# 1. Are all containers running?
docker compose ps

# 2. Any containers exited?
docker compose ps --filter status=exited

# 3. What do the logs say?
docker compose logs

# 4. Are ports 80/443 free?
sudo lsof -i :80
sudo lsof -i :443

# 5. Are ports 5432/6379 free?
sudo lsof -i :5432
sudo lsof -i :6379

# 6. Is Docker daemon running?
sudo systemctl status docker

# 7. Does your user have Docker access?
docker ps     # error here = permissions issue
```

---

## Error Index

| Error | Section |
|-------|---------|
| `b5-proxy` exits immediately | [§1](#1-b5-proxy-exits-immediately) |
| Port 80 already in use | [§2](#2-port-80-already-in-use) |
| `b5-postgres` keeps restarting | [§3](#3-b5-postgres-keeps-restarting) |
| Port 5432 already in use | [§4](#4-port-5432-already-in-use) |
| `b5-redis` exits or refuses connections | [§5](#5-b5-redis-exits-or-refuses-connections) |
| WAF is not blocking attacks | [§6](#6-waf-is-not-blocking-attacks) |
| `curl http://localhost` returns connection refused | [§7](#7-curl-httplocalhost-returns-connection-refused) |
| `docker compose up` fails with permission error | [§8](#8-docker-compose-up-fails-with-permission-error) |
| Lua script errors | [§9](#9-lua-script-errors) |
| PostgreSQL authentication failure | [§10](#10-postgresql-authentication-failure) |
| `dummy-app` not reachable from browser | [§11](#11-dummy-app-not-reachable-from-browser) |
| `docker compose pull` fails | [§12](#12-docker-compose-pull-fails) |
| SELinux blocking volume mounts (RHEL/CentOS) | [§13](#13-selinux-blocking-volume-mounts-rhelcentos) |
| B5 blocks legitimate requests (false positives) | [§14](#14-b5-blocks-legitimate-requests-false-positives) |

---

## 1. b5-proxy Exits Immediately

### Symptoms

```bash
docker compose ps
# NAME       STATUS
# b5-proxy   Exited (1)
```

### Diagnosis

```bash
docker compose logs b5-proxy
```

### Common Causes and Fixes

**A. Nginx configuration syntax error**

Log shows:
```
nginx: [emerg] unexpected "}" in /usr/local/openresty/nginx/conf/b5.conf:42
```

Fix: Validate the config:

```bash
docker run --rm \
  -v $(pwd)/proxy/conf:/usr/local/openresty/nginx/conf \
  -v $(pwd)/proxy/lua:/usr/local/openresty/nginx/lua \
  openresty/openresty:bullseye nginx -t
```

Correct the syntax error reported, then restart:

```bash
docker compose up -d b5-proxy
```

**B. Lua script syntax error**

Log shows:
```
[error] init_by_lua error: ... attempt to index a nil value
```

Open `proxy/lua/init.lua` and check for syntax errors. Common mistakes:
- Missing closing `}` in a Lua table.
- Unclosed string (missing `"`).
- Wrong key name in `B5_CONFIG`.

**C. Volume mount directory missing**

Log shows:
```
[emerg] open() "/usr/local/openresty/nginx/conf/nginx.conf" failed (2: No such file or directory)
```

Verify the required directories and files exist:

```bash
ls proxy/conf/nginx.conf proxy/conf/b5.conf proxy/lua/init.lua proxy/lua/access.lua
```

If any file is missing, create it or restore from Git:

```bash
git checkout -- proxy/
```

---

## 2. Port 80 Already in Use

### Symptoms

```bash
docker compose logs b5-proxy
# [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

### Diagnosis

```bash
sudo lsof -i :80
# COMMAND   PID     USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
# nginx    1234     root    6u  IPv4   12345      0t0  TCP *:http (LISTEN)
# apache2  5678     root    4u  IPv4   67890      0t0  TCP *:http (LISTEN)
```

### Fix

**Option A — Stop the conflicting service**

```bash
sudo systemctl stop nginx        # if Nginx is running
sudo systemctl stop apache2      # if Apache is running
sudo systemctl stop lighttpd     # if Lighttpd is running
```

Then restart B5:

```bash
docker compose restart b5-proxy
```

**Option B — Change B5's port**

If you cannot stop the other service, change the port mapping in `docker-compose.yml`:

```yaml
b5-proxy:
  ports:
    - "8080:80"      # B5 listens on host port 8080 instead of 80
    - "8443:443"
```

Then access B5 on `http://localhost:8080`.

---

## 3. b5-postgres Keeps Restarting

### Symptoms

```bash
docker compose ps
# NAME          STATUS
# b5-postgres   Restarting (1) 5 seconds ago
```

### Diagnosis

```bash
docker compose logs b5-postgres
```

### Common Causes and Fixes

**A. Port 5432 in use** — see [§4](#4-port-5432-already-in-use).

**B. Corrupt data volume**

Log shows:
```
FATAL: data directory "/var/lib/postgresql/data" has wrong ownership
```
or:
```
PANIC: could not locate a valid checkpoint record
```

Fix (destroys existing data — ensure you have a backup):

```bash
docker compose down -v
docker compose up -d
```

**C. init.sql syntax error**

Log shows:
```
ERROR:  syntax error at or near "INSERT" at character 42
```

Open `database/init.sql` and fix the SQL syntax. Then reset:

```bash
docker compose down -v
docker compose up -d
```

---

## 4. Port 5432 Already in Use

### Diagnosis

```bash
sudo lsof -i :5432
# postgres  9876  postgres  5u  IPv4  ...  *:postgresql (LISTEN)
```

### Fix

**Option A — Stop local PostgreSQL**

```bash
sudo systemctl stop postgresql
```

**Option B — Change B5's PostgreSQL port**

In `docker-compose.yml`:

```yaml
b5-postgres:
  ports:
    - "5433:5432"    # Map to host port 5433 instead
```

Update any application that connects to PostgreSQL to use port 5433 on the host. Containers on the same Docker network still connect on port 5432 internally.

---

## 5. b5-redis Exits or Refuses Connections

### Symptoms

```bash
docker compose logs b5-redis
# # Could not create server TCP listening socket 0.0.0.0:6379: bind: Address already in use
```

### Fix

Stop local Redis or change the port:

```bash
sudo systemctl stop redis-server    # Ubuntu/Debian
sudo systemctl stop redis           # CentOS/RHEL
```

Or change the port in `docker-compose.yml`:

```yaml
b5-redis:
  ports:
    - "6380:6379"
```

---

## 6. WAF Is Not Blocking Attacks

### Symptoms

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"
# Returns 200 instead of 403
```

### Diagnosis Steps

**A. Check that access.lua is loading correctly**

```bash
docker compose logs b5-proxy | grep -i "b5\|lua\|error"
```

Look for `[B5 WAF initialized]` to confirm init.lua ran successfully.

**B. Check that access_by_lua_file is in b5.conf**

```bash
grep "access_by_lua_file" proxy/conf/b5.conf
# access_by_lua_file lua/access.lua;
```

If this line is missing, add it inside the `server {}` block and reload:

```bash
docker exec b5-proxy nginx -s reload
```

**C. Check the pattern in init.lua**

```bash
grep -A 5 "sql_patterns" proxy/lua/init.lua
```

The pattern `(?i)union.*select` should be present.

**D. Try URL-encoding the payload differently**

B5 normalises percent-encoded URIs. Verify with:

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1%27%20UNION%20SELECT%20*%20FROM%20users--"
# Should also return 403
```

**E. Restart the proxy to force Lua reload**

```bash
docker compose restart b5-proxy
```

---

## 7. curl http://localhost Returns Connection Refused

### Diagnosis

```bash
docker compose ps b5-proxy
# Is b5-proxy actually Up?

sudo lsof -i :80
# Is anything listening on port 80?

sudo ufw status      # Ubuntu
sudo firewall-cmd --list-all   # CentOS/RHEL
# Is port 80 allowed?
```

### Fixes

- If `b5-proxy` is not running: `docker compose up -d b5-proxy`
- If firewall is blocking: `sudo ufw allow 80/tcp` or `sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload`
- On Linux, binding to port 80 may require root if Docker is not configured for rootless mode.

---

## 8. docker compose up Fails with Permission Error

### Symptoms

```
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

### Fix

```bash
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

If the error persists after adding to the group, log out and log back in.

---

## 9. Lua Script Errors

### Common Lua Errors and Fixes

| Error message | Cause | Fix |
|--------------|-------|-----|
| `attempt to index a nil value (global 'B5_CONFIG')` | `init.lua` did not run | Check `nginx.conf` has `init_by_lua_file lua/init.lua;` |
| `module 'resty.redis' not found` | Missing Lua library | Use the correct OpenResty image — `openresty/openresty:bullseye`, not plain Nginx |
| `bad argument #1 to 'match' (string expected, got nil)` | `ngx.var.request_uri` is nil | Ensure the `access_by_lua_file` directive is inside a `location {}` or `server {}` block that handles actual requests |
| `stack traceback: ...access.lua:15` | Runtime error in access.lua | Read the full log line; the line number tells you exactly where |

### Validate Lua syntax without running the container

```bash
# Install luac (Lua compiler) to check syntax
sudo apt install lua5.1
luac -p proxy/lua/init.lua    # no output = no syntax errors
luac -p proxy/lua/access.lua
```

---

## 10. PostgreSQL Authentication Failure

### Symptoms

```bash
docker compose logs b5-postgres
# FATAL:  password authentication failed for user "b5admin"
```

### Causes

- Credentials in `docker-compose.yml` do not match those the volume was initialised with.
- The volume was created with different credentials on a previous run.

### Fix

Reset the volume (destroys all data):

```bash
docker compose down -v
docker compose up -d
```

Then connect to verify:

```bash
docker exec -it b5-postgres psql -U b5admin -d b5 -c "\dt"
```

---

## 11. dummy-app Not Reachable from Browser

The `dummy-app` container is intentionally only on the internal `b5-network` — it has no host port mapping. It is only accessible through B5.

- Access it via B5: `http://localhost`
- **Do not** try to connect to `dummy-app` directly from the browser.

If you need to debug the dummy app directly:

```bash
docker exec -it dummy-app sh
wget -qO- http://localhost    # test from inside the container
```

---

## 12. docker compose pull Fails

### Symptoms

```
Error response from daemon: Get "https://registry-1.docker.io/v2/": dial tcp: lookup registry-1.docker.io: no such host
```

### Causes

- No internet access on the server.
- DNS resolution failing.

### Fixes

```bash
# Test DNS
ping -c 3 registry-1.docker.io

# Test Docker Hub specifically
curl -I https://registry-1.docker.io/v2/

# If DNS is failing, set a public DNS server
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

---

## 13. SELinux Blocking Volume Mounts (RHEL/CentOS)

### Symptoms

```bash
docker compose logs b5-proxy
# [emerg] open("/usr/local/openresty/nginx/conf/nginx.conf") failed (13: Permission denied)
```

### Diagnosis

```bash
sudo ausearch -m avc -ts recent | grep nginx
# Should show SELinux AVC denial
```

### Fix

Label the volume directories with the correct SELinux context:

```bash
sudo chcon -Rt svirt_sandbox_file_t $(pwd)/proxy/
sudo chcon -Rt svirt_sandbox_file_t $(pwd)/database/
```

Or add `:z` to volume mounts in `docker-compose.yml`:

```yaml
volumes:
  - ./proxy/conf:/usr/local/openresty/nginx/conf/:z
  - ./proxy/lua:/usr/local/openresty/nginx/lua/:z
```

---

## 14. B5 Blocks Legitimate Requests (False Positives)

### Diagnosis

```bash
# Check what pattern matched
docker compose logs b5-proxy | grep "WARN"
# [warn] [B5 WAF Block] ... Matched pattern: (?i)union.*select
```

### Fixes

**A. Narrow the pattern** in `proxy/lua/init.lua`

For example, if the word `union` appears in legitimate content, add a word boundary:

```lua
"(?i)\\bunion\\s+select"    -- more precise than "union.*select"
```

**B. Add an allowlist for trusted IPs** — switch B5 to `logging` mode and add an explicit allow rule for the offending IP.

**C. Switch to logging mode temporarily** to observe without blocking:

```lua
-- In init.lua, change:
mode = "logging",   -- was "blocking"
```

Restart proxy after changes:

```bash
docker compose restart b5-proxy
```

---

## Still Stuck?

Collect the following information before asking for help:

```bash
# Full logs from all containers
docker compose logs > b5-debug-$(date +%F).log

# Container status
docker compose ps >> b5-debug-$(date +%F).log

# Docker and OS versions
docker --version >> b5-debug-$(date +%F).log
docker compose version >> b5-debug-$(date +%F).log
uname -a >> b5-debug-$(date +%F).log
```

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [quickstart.md](quickstart.md) | Quick start guide (step-by-step) |
| [ubuntu_install.md](ubuntu_install.md) | Full Ubuntu installation |
| [centos_rhel_install.md](centos_rhel_install.md) | CentOS/RHEL installation |
| [prerequisites.md](prerequisites.md) | Required tools and versions |
