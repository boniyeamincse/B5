# B5 WAF — Setting Up Dummy Test Applications Behind B5

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [quickstart.md](quickstart.md), [nginx_integration.md](nginx_integration.md)

---

## Overview

Dummy test applications (also called "backend apps" or "protected apps") are lightweight web servers placed behind B5 to simulate a real application during development, testing, and demonstration. They let you:

- Verify that B5 is correctly proxying clean traffic through.
- Confirm that B5 is blocking attacks before they reach the backend.
- Test different request types (GET, POST, JSON APIs) without risking a real application.
- Demonstrate B5 to stakeholders without production dependencies.

---

## What B5 Already Includes

The default `docker-compose.yml` includes a `dummy-app` service — a plain Nginx container that serves a single static HTML page:

```yaml
dummy-app:
  image: nginx:alpine
  volumes:
    - ./dummy-app:/usr/share/nginx/html:ro
  networks:
    - b5-network
```

The page at `dummy-app/index.html` confirms that B5 allowed the request through.

---

## Option 1 — The Default Static Dummy App (Already Running)

No additional setup required. After `docker compose up -d`, the dummy app is running and B5 proxies traffic to it on `http://localhost`.

### Verify

```bash
curl http://localhost
# <h1>Welcome to the Protected App</h1>
```

### Customise the Dummy App Page

Edit `dummy-app/index.html` to simulate different application responses:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test App — Login</title>
</head>
<body>
    <h1>Test Application — Login Page</h1>
    <form method="POST" action="/login">
        <input type="text" name="username" placeholder="Username">
        <input type="password" name="password" placeholder="Password">
        <button type="submit">Log In</button>
    </form>
    <p>This page is protected by B5 WAF.</p>
</body>
</html>
```

The change takes effect immediately — no restart required (volume is mounted).

---

## Option 2 — Add a JSON API Dummy App

To test B5's inspection of JSON API payloads, add a simple JSON-responding backend using Python's built-in HTTP server.

### Add to docker-compose.yml

```yaml
services:
  # ... existing services ...

  dummy-api:
    image: python:3.11-alpine
    command: >
      python3 -c "
      import http.server, json
      class H(http.server.BaseHTTPRequestHandler):
          def do_GET(self):
              self.send_response(200)
              self.send_header('Content-Type', 'application/json')
              self.end_headers()
              self.wfile.write(json.dumps({'status': 'ok', 'message': 'API reachable'}).encode())
          def do_POST(self):
              length = int(self.headers.get('Content-Length', 0))
              body = self.rfile.read(length)
              self.send_response(200)
              self.send_header('Content-Type', 'application/json')
              self.end_headers()
              self.wfile.write(json.dumps({'received': True, 'bytes': length}).encode())
          def log_message(self, f, *a): pass
      http.server.HTTPServer(('', 8080), H).serve_forever()
      "
    networks:
      - b5-network
```

### Add an API route in b5.conf

```nginx
server {
    listen 80;
    server_name localhost;

    access_by_lua_file lua/access.lua;

    # Existing dummy app
    location / {
        proxy_pass http://dummy-app:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # New JSON API dummy
    location /api/ {
        proxy_pass http://dummy-api:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Content-Type $content_type;
    }
}
```

Reload:

```bash
docker compose up -d dummy-api
docker exec b5-proxy nginx -s reload
```

Test:

```bash
curl http://localhost/api/
# {"status": "ok", "message": "API reachable"}

curl -X POST http://localhost/api/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "query": "select * from users"}'
# B5 should block — the JSON body contains SQL injection
```

---

## Option 3 — Use HTTPBin as a Feature-Rich Test Backend

[HTTPBin](https://httpbin.org) is a standard HTTP testing service with endpoints for every HTTP method, header inspection, redirects, cookies, and more.

### Add to docker-compose.yml

```yaml
  httpbin:
    image: kennethreitz/httpbin
    networks:
      - b5-network
```

### Add a route in b5.conf

```nginx
location /test/ {
    proxy_pass http://httpbin:80/;
    access_by_lua_file lua/access.lua;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Useful HTTPBin endpoints for B5 testing

```bash
# Inspect request headers (confirm X-Real-IP is set correctly)
curl http://localhost/test/headers

# Test GET with query parameters (for SQLi/XSS testing)
curl "http://localhost/test/get?q=<script>alert(1)</script>"

# Test POST with JSON body
curl -X POST http://localhost/test/post \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'

# Test a redirect
curl http://localhost/test/redirect/3

# Test slow responses (timeout testing)
curl "http://localhost/test/delay/2"
```

---

## Option 4 — Multiple Backends (Different Apps per Path)

Simulate a real microservices environment with multiple backends, each on a different path:

```nginx
server {
    listen 80;
    server_name localhost;

    access_by_lua_file lua/access.lua;

    # Main web app
    location / {
        proxy_pass http://dummy-app:80;
    }

    # REST API
    location /api/ {
        proxy_pass http://dummy-api:8080/;
    }

    # Admin panel (restrict to internal only)
    location /admin/ {
        # Only allow from Docker internal network
        allow 172.16.0.0/12;
        deny all;
        proxy_pass http://dummy-app:80;
    }

    # Upload endpoint (test large payload handling)
    location /upload {
        client_max_body_size 10m;
        proxy_pass http://httpbin:80/post;
    }
}
```

---

## Testing Attack Patterns Against Dummy Apps

Use these commands to verify B5 blocks attacks against any dummy backend:

### SQL Injection

```bash
# GET parameter
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1' OR '1'='1"
# Expected: 403

# POST body (requires body inspection to be enabled)
curl -o /dev/null -s -w "%{http_code}" \
  -X POST http://localhost/login \
  -d "username=admin'--&password=anything"
# Expected: 403 (if POST body inspection is configured)
```

### Cross-Site Scripting (XSS)

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/search?q=<script>alert(document.cookie)</script>"
# Expected: 403
```

### Path Traversal

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/files?path=../../etc/passwd"
# Expected: 403 (if path traversal pattern is in rules)
```

### Clean Request (Should Pass Through)

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/search?q=hello+world"
# Expected: 200
```

---

## Viewing Which Requests Reached the Backend

Since the dummy app is plain Nginx, you can see which requests B5 allowed through:

```bash
docker compose logs dummy-app
```

Blocked requests (HTTP 403 from B5) will **not** appear in the dummy app logs — they were never forwarded.

---

## Resetting the Dummy App

The dummy app stores no state. To reset it, simply restart:

```bash
docker compose restart dummy-app
```

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [quickstart.md](quickstart.md) | Full 10-step quick start |
| [nginx_integration.md](nginx_integration.md) | Replace dummy app with a real Nginx backend |
| [apache_integration.md](apache_integration.md) | Replace dummy app with an Apache backend |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
