# B5 WAF — Ubuntu Server Installation Guide

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Tested on:** Ubuntu 22.04 LTS, Ubuntu 24.04 LTS  
**Related:** [prerequisites.md](prerequisites.md), [quickstart.md](quickstart.md)

---

## Overview

This guide walks through a complete B5 WAF installation on a fresh Ubuntu server, including:

- Installing Docker Engine and Docker Compose.
- Cloning B5 and configuring the environment.
- Starting the stack and verifying it is working.
- Configuring the firewall (`ufw`).
- Setting up B5 as a systemd service so it starts automatically on reboot.

**Estimated time:** 15–20 minutes on a fresh server.

---

## Prerequisites

| Requirement | Detail |
|-------------|--------|
| OS | Ubuntu 22.04 LTS or 24.04 LTS (64-bit) |
| RAM | Minimum 1 GB (2 GB recommended) |
| CPU | 1 vCPU minimum (2+ recommended for production) |
| Disk | 10 GB free |
| Network | Ports 80 and 443 open inbound |
| User | A non-root user with `sudo` privileges |

---

## Step 1 — Update the System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ca-certificates gnupg lsb-release
```

---

## Step 2 — Install Docker Engine

```bash
# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

### Allow running Docker without sudo

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Verify

```bash
docker --version
# Docker version 26.1.0

docker compose version
# Docker Compose version v2.27.0

docker run hello-world
# Hello from Docker! — confirms Docker daemon is running
```

---

## Step 3 — Clone the B5 Repository

```bash
# Choose an install location (recommended: /opt/b5)
sudo mkdir -p /opt/b5
sudo chown $USER:$USER /opt/b5

git clone https://github.com/your-org/b5.git /opt/b5
cd /opt/b5
```

Verify the directory structure:

```bash
ls -la
# docker-compose.yml  database/  docs/  proxy/  dummy-app/
```

---

## Step 4 — Configure Environment Variables

Create a `.env` file in the project root to override default credentials:

```bash
cp .env.example .env    # if an example file exists
# or create it from scratch:
nano /opt/b5/.env
```

Minimum production settings:

```ini
# PostgreSQL
POSTGRES_USER=b5admin
POSTGRES_PASSWORD=change-this-strong-password
POSTGRES_DB=b5

# Redis (optional password)
REDIS_PASSWORD=change-this-redis-password

# FastAPI
SECRET_KEY=generate-a-64-byte-random-hex-string-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Generate a strong `SECRET_KEY`:

```bash
openssl rand -hex 32
# e.g.: a3f8c2d1e9b74506f2c8a1d3e5f7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2
```

> **Security note:** Never commit `.env` to Git. The `.gitignore` should already exclude it.

---

## Step 5 — Configure the Firewall (ufw)

```bash
# Allow SSH (important — do not skip this or you will lock yourself out)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS for the WAF proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable

# Verify
sudo ufw status
```

Expected output:

```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

> **Do not expose** PostgreSQL (5432) or Redis (6379) ports to the internet. In `docker-compose.yml`, remove or restrict the port mappings for `b5-postgres` and `b5-redis` for any internet-facing server.

---

## Step 6 — Start B5

```bash
cd /opt/b5
docker compose up -d
```

Check that all containers are running:

```bash
docker compose ps
```

Expected:

```
NAME          STATUS
b5-proxy      Up
b5-redis      Up
b5-postgres   Up
dummy-app     Up
```

Test the proxy is serving traffic:

```bash
curl -s http://localhost | grep "Welcome"
# <h1>Welcome to the Protected App</h1>
```

Test WAF blocking:

```bash
curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Step 7 — Set Up Automatic Start on Reboot (systemd)

Create a systemd service so B5 starts automatically when the server reboots:

```bash
sudo nano /etc/systemd/system/b5.service
```

Paste the following (adjust `WorkingDirectory` if you used a different install path):

```ini
[Unit]
Description=B5 Web Application Firewall
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/b5
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable b5.service
sudo systemctl start b5.service

# Check status
sudo systemctl status b5.service
```

Verify it survives a reboot:

```bash
sudo reboot
# (after reboot)
docker compose -f /opt/b5/docker-compose.yml ps
```

---

## Step 8 — Point Your Domain at B5

To protect a real application, update your DNS to point your domain to this server's public IP address, then configure B5's upstream in `proxy/conf/b5.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    access_by_lua_file lua/access.lua;

    location / {
        proxy_pass http://your-backend-server:port;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After editing `b5.conf`, reload the proxy (no downtime):

```bash
docker exec b5-proxy nginx -s reload
```

---

## Step 9 — View Logs

```bash
# Live proxy and WAF logs
docker compose -f /opt/b5/docker-compose.yml logs -f b5-proxy

# PostgreSQL logs
docker compose -f /opt/b5/docker-compose.yml logs b5-postgres
```

Logs are also written to `proxy/logs/error.log` on the host via the volume mount.

---

## Useful Maintenance Commands

```bash
# Pull latest images and restart
cd /opt/b5
git pull
docker compose pull
docker compose up -d

# Backup PostgreSQL
docker exec b5-postgres pg_dump -U b5admin b5 > /opt/b5/backups/b5_$(date +%F).sql

# Check resource usage
docker stats
```

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [quickstart.md](quickstart.md) | Local development quick start |
| [prerequisites.md](prerequisites.md) | Prerequisite tools and versions |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
| [aws_ec2_deploy.md](aws_ec2_deploy.md) | Deploy to AWS EC2 |
