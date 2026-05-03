# B5 WAF Configuration & Environment Guide

This section covers the configuration and environment setup for the B5 Web Application Firewall (Tasks 21-30).

## 21. Environment Variables (`.env`)
B5 relies on several environment variables to configure its behavior without hardcoding credentials or settings.
- `B5_MODE`: Controls the WAF mode (`blocking`, `logging`, `learning`). Default is `blocking`.
- `B5_REDIS_HOST`: The hostname of the Redis instance. Default is `b5-redis`.
- `B5_REDIS_PORT`: The port of the Redis instance. Default is `6379`.
- `POSTGRES_USER`: The admin user for the PostgreSQL database.
- `POSTGRES_PASSWORD`: The password for the PostgreSQL database.
- `POSTGRES_DB`: The database name. Default is `b5`.

## 22. Docker Compose Structure (`docker-compose.yml`)
The `docker-compose.yml` file orchestrates the multi-container environment:
- **b5-proxy**: The OpenResty (Nginx+Lua) data plane. Exposes ports `8080:80` and `8443:443`.
- **b5-redis**: In-memory data store for rate limiting and fast lookups.
- **b5-postgres**: Relational database for persistent storage of users and rules.
- **dummy-app**: A simple Nginx container used as a target for testing proxy functionality.

## 23. SSL/TLS Certificates in OpenResty
To enable HTTPS, place your SSL certificates (`server.crt` and `server.key`) in the `proxy/conf/certs` directory (create if it doesn't exist). Update `proxy/conf/b5.conf` to include:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /usr/local/openresty/nginx/conf/certs/server.crt;
    ssl_certificate_key /usr/local/openresty/nginx/conf/certs/server.key;
    # ... B5 rules ...
}
```

## 24. Let's Encrypt Integration
For automated SSL certificates, we recommend running Certbot locally or deploying the `jrcs/letsencrypt-nginx-proxy-companion` container alongside B5. Alternatively, you can use the `lua-resty-auto-ssl` plugin inside OpenResty to dynamically generate and renew Let's Encrypt certificates on the fly.

## 25. Custom Nginx Overrides (`b5.conf`)
The `proxy/conf/b5.conf` file is where you define your server blocks (virtual hosts) and route traffic to your upstream backends using `proxy_pass`. This is also where you attach the WAF logic to specific locations using `access_by_lua_file lua/access.lua;`.

## 26. Database Connection String
When the FastAPI backend is built, it will connect to PostgreSQL using the standard SQLAlchemy connection string format:
`postgresql://b5admin:b5password@b5-postgres:5432/b5`

## 27. Redis Connection Tuning
Redis connections are pooled globally in `init.lua`. Key tuning parameters include:
- `red:set_timeouts(1000, 1000, 1000)`: Sets the connect, send, and read timeouts to 1 second.
- `red:set_keepalive(10000, 100)`: Keeps idle connections in the pool for up to 10 seconds, with a maximum pool size of 100 connections per Nginx worker.

## 28. Configuring CORS Policies
Cross-Origin Resource Sharing (CORS) can be handled in OpenResty by appending custom headers in `b5.conf`:
```nginx
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
```
Or managed programmatically inside `access.lua` based on the request origin.

## 29. Changing Default Ports
If ports 80/443 are already in use on your host (e.g., by another web server), you can map B5 to different ports in `docker-compose.yml` under the `b5-proxy` service:
```yaml
ports:
  - "8080:80"
  - "8443:443"
```
Ensure your external Load Balancer or Firewall points to these new host ports.

## 30. Securing the Admin Dashboard Route
The future Next.js Admin Dashboard should not be exposed to the public internet without protection. To secure it:
- Restrict access to internal VPN IPs using OpenResty `allow` and `deny` directives.
- Use the built-in JWT authentication in the FastAPI backend.
- Place the dashboard behind an SSO proxy (like Cloudflare Access or Authelia).
