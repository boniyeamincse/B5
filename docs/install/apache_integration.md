# B5 WAF — Adding B5 in Front of an Apache Web Server

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [nginx_integration.md](nginx_integration.md), [quickstart.md](quickstart.md)

---

## Overview

This guide explains how to place B5 WAF in front of an **existing Apache (httpd) web server**. The architecture is identical to the Nginx integration:

```
Internet → B5 WAF (OpenResty, port 80/443) → Apache (private port 8080)
```

B5 inspects every request and proxies clean traffic to Apache. Apache never sees raw internet traffic and cannot be accessed directly from outside.

---

## Two Deployment Scenarios

| Scenario | Description |
|----------|-------------|
| **Same host** | B5 and Apache run on the same server. Apache moves to port 8080. |
| **Separate host** | B5 runs on a dedicated WAF server; Apache runs on the app server. |

---

## Scenario A — Same Host

### Step 1 — Move Apache to Port 8080

#### On Ubuntu / Debian

Edit `/etc/apache2/ports.conf`:

```apache
# Change: Listen 80  →  Listen 8080
Listen 8080
```

Edit each virtual host in `/etc/apache2/sites-enabled/`:

```apache
# Change: <VirtualHost *:80>  →  <VirtualHost *:8080>
<VirtualHost *:8080>
    ServerName yourdomain.com
    DocumentRoot /var/www/html
    # ... rest of config ...
</VirtualHost>
```

Reload Apache:

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

#### On CentOS / RHEL

Edit `/etc/httpd/conf/httpd.conf`:

```apache
# Change: Listen 80  →  Listen 8080
Listen 8080
```

Edit virtual host files in `/etc/httpd/conf.d/`:

```apache
<VirtualHost *:8080>
    ServerName yourdomain.com
    DocumentRoot /var/www/html
</VirtualHost>
```

Reload:

```bash
sudo apachectl configtest
sudo systemctl reload httpd
```

Verify Apache responds on 8080:

```bash
curl -s http://localhost:8080 | head -5
```

### Step 2 — Update B5's docker-compose.yml (host-gateway)

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

### Step 3 — Configure B5's b5.conf

Edit `proxy/conf/b5.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    access_by_lua_file lua/access.lua;

    location / {
        proxy_pass         http://host.docker.internal:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    error_page 403 /403.html;
    location = /403.html {
        return 403 '<h1>Access Denied</h1><p>Request blocked by B5 WAF.</p>';
        add_header Content-Type text/html;
    }
}
```

### Step 4 — Start B5

```bash
cd /opt/b5
docker compose up -d
```

Test:

```bash
curl -s http://localhost | head -5          # should return your Apache site
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Scenario B — Separate Hosts

B5 runs on a dedicated server (`10.0.0.10`). Apache runs on the application server (`10.0.0.20:80`).

### Step 1 — Allow WAF Access to Apache

On the Apache host (`10.0.0.20`):

```bash
# Ubuntu/Debian
sudo ufw allow from 10.0.0.10 to any port 80

# CentOS/RHEL
sudo firewall-cmd --permanent \
  --add-rich-rule='rule family=ipv4 source address=10.0.0.10 port port=80 protocol=tcp accept'
sudo firewall-cmd --reload
```

### Step 2 — Configure B5's b5.conf

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

---

## Preserving the Real Client IP in Apache Logs

When Apache receives requests via B5, all requests appear to come from the B5 IP unless you configure `mod_remoteip`.

### Enable mod_remoteip

```bash
# Ubuntu / Debian
sudo a2enmod remoteip

# CentOS / RHEL (included in httpd by default)
# Just add the config below
```

### Configure mod_remoteip

Create or edit `/etc/apache2/conf-enabled/remoteip.conf` (Ubuntu) or `/etc/httpd/conf.d/remoteip.conf` (RHEL):

```apache
RemoteIPHeader X-Forwarded-For
RemoteIPTrustedProxy 10.0.0.10        # IP of the B5 WAF server
# For Docker same-host deployments:
# RemoteIPTrustedProxy 172.16.0.0/12  # Docker bridge network
```

Update the LogFormat to use `%a` (real client IP) instead of `%h` (connection IP):

```apache
LogFormat "%a %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\"" combined
```

Reload Apache:

```bash
sudo systemctl reload apache2    # or httpd
```

---

## Apache with mod_security (Handling Conflicts)

If Apache already runs `mod_security`, you now have two WAF layers. Recommendations:

1. **Keep B5 as the primary WAF** — it inspects before Apache receives the request.
2. **Disable mod_security or set it to DetectionOnly** on the Apache side to avoid double-blocking false positives.
3. Log both layers for comparison during initial deployment to validate B5's rules.

To set mod_security to detection-only mode:

```apache
SecRuleEngine DetectionOnly
```

---

## Multiple Virtual Hosts

To protect multiple Apache virtual hosts, add a `server` block per domain in `b5.conf`:

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

Reload without downtime:

```bash
docker exec b5-proxy nginx -t && docker exec b5-proxy nginx -s reload
```

---

## Key Differences: Apache vs Nginx Integration

| Aspect | Apache | Nginx |
|--------|--------|-------|
| Port change file | `ports.conf` + VirtualHost | `server { listen 8080; }` |
| Reload command | `systemctl reload apache2` / `httpd` | `nginx -s reload` |
| Real IP module | `mod_remoteip` | `ngx_http_realip_module` (built-in) |
| Existing WAF | `mod_security` (may conflict) | Typically none |

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [nginx_integration.md](nginx_integration.md) | Adding B5 in front of Nginx |
| [quickstart.md](quickstart.md) | Local Docker Compose quick start |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
