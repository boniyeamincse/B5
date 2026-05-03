# B5 WAF — Adding B5 in Front of an Existing Nginx Web Server

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [apache_integration.md](apache_integration.md), [quickstart.md](quickstart.md)

---

## Overview

This guide explains how to place the B5 WAF in front of an **existing Nginx web server** that is already serving traffic. The result is a two-tier architecture:

```
Internet → B5 WAF (OpenResty, port 80/443) → Existing Nginx (private port)
```

B5 becomes the public entry point. It inspects every request for threats, then proxies clean traffic to the existing Nginx server on a private port (e.g., 8080).

---

## Two Deployment Scenarios

| Scenario | Description |
|----------|-------------|
| **Same host** | B5 and your existing Nginx both run on the same machine. Nginx moves to a non-privileged port. |
| **Separate host** | B5 runs on a dedicated server; your existing Nginx runs on a different server. B5 proxies over the network. |

---

## Scenario A — Same Host (Move Nginx to Port 8080)

### Step 1 — Change the Existing Nginx Port to 8080

Edit your existing Nginx server block (usually in `/etc/nginx/sites-enabled/` or `/etc/nginx/conf.d/`):

```nginx
# Before: was listening on port 80
server {
    listen 8080;            # Changed from 80 to 8080
    server_name yourdomain.com;

    root /var/www/html;
    index index.html;
    # ... rest of your config ...
}
```

Reload the existing Nginx:

```bash
sudo nginx -t               # test config
sudo systemctl reload nginx
```

Verify it now responds on 8080:

```bash
curl -s http://localhost:8080 | head -5
```

### Step 2 — Update B5's `b5.conf` to Point at the Existing Nginx

Edit `proxy/conf/b5.conf` in the B5 project directory:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    access_by_lua_file lua/access.lua;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    error_page 403 /403.html;
    location = /403.html {
        return 403 '<h1>Access Denied</h1><p>Your request has been blocked by the B5 Web Application Firewall.</p>';
        add_header Content-Type text/html;
    }
}
```

> **Important:** When running B5 in Docker, `127.0.0.1` refers to the container's loopback — not the host. Use `host-gateway` instead.

### Step 3 — Add host-gateway to docker-compose.yml

To allow the B5 container to reach `localhost` on the Docker host:

```yaml
services:
  b5-proxy:
    image: openresty/openresty:bullseye
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./proxy/conf:/usr/local/openresty/nginx/conf/
      - ./proxy/lua:/usr/local/openresty/nginx/lua/
```

Then update `b5.conf` to use `host.docker.internal` instead of `127.0.0.1`:

```nginx
proxy_pass http://host.docker.internal:8080;
```

### Step 4 — Start B5

```bash
cd /opt/b5
docker compose up -d
```

Verify:

```bash
curl -s http://localhost | head -5
# Should return your existing site through B5

curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Scenario B — Separate Hosts

B5 runs on a dedicated WAF server (`10.0.0.10`). The existing Nginx runs on an application server (`10.0.0.20`).

### Network topology

```
Internet → B5 WAF (10.0.0.10:80) → App Server Nginx (10.0.0.20:80)
```

### Step 1 — Ensure the App Server Nginx is Accessible from the WAF Server

On the application server (`10.0.0.20`), allow connections from the WAF server IP:

```bash
# Ubuntu/Debian
sudo ufw allow from 10.0.0.10 to any port 80

# CentOS/RHEL
sudo firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=10.0.0.10 port port=80 protocol=tcp accept'
sudo firewall-cmd --reload
```

(Optionally, move Nginx to a non-standard port and block port 80 from the internet so traffic can only enter through B5.)

### Step 2 — Update B5's b5.conf

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    access_by_lua_file lua/access.lua;

    location / {
        proxy_pass         http://10.0.0.20:80;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### Step 3 — Start B5 and Test

```bash
docker compose up -d
curl -s http://10.0.0.10 | head -5
```

---

## Preserving the Real Client IP in Nginx Logs

When the existing Nginx receives requests via B5, the client IP will appear as B5's IP unless you configure `realip`. Add this to your existing Nginx config:

```nginx
# Trust the B5 proxy IP (or the Docker network range)
set_real_ip_from  10.0.0.10;         # WAF server IP (separate host)
# OR for Docker same-host:
set_real_ip_from  172.16.0.0/12;     # Docker bridge network range

real_ip_header    X-Forwarded-For;
real_ip_recursive on;
```

Reload Nginx after the change:

```bash
sudo nginx -s reload
```

---

## Multiple Virtual Hosts (Multiple Domains)

To protect multiple domains with one B5 instance, add multiple `server` blocks to `b5.conf`:

```nginx
server {
    listen 80;
    server_name app1.example.com;
    access_by_lua_file lua/access.lua;
    location / { proxy_pass http://10.0.0.21:80; }
}

server {
    listen 80;
    server_name app2.example.com;
    access_by_lua_file lua/access.lua;
    location / { proxy_pass http://10.0.0.22:80; }
}
```

Reload after saving:

```bash
docker exec b5-proxy nginx -s reload
```

---

## Applying Changes Without Downtime

After any change to `b5.conf` or `nginx.conf`, test and reload — no restart required:

```bash
# Test the new config inside the container
docker exec b5-proxy nginx -t

# Reload (zero downtime — active connections are not dropped)
docker exec b5-proxy nginx -s reload
```

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [apache_integration.md](apache_integration.md) | Adding B5 in front of Apache |
| [quickstart.md](quickstart.md) | Local Docker Compose quick start |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
