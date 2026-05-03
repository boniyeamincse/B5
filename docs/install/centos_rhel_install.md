# B5 WAF — CentOS / RHEL Installation Guide

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Tested on:** CentOS Stream 9, RHEL 9, Rocky Linux 9, AlmaLinux 9  
**Related:** [prerequisites.md](prerequisites.md), [ubuntu_install.md](ubuntu_install.md)

---

## Overview

This guide covers a complete B5 WAF installation on CentOS Stream 9, RHEL 9, Rocky Linux 9, or AlmaLinux 9. The steps are almost identical across all four distributions.

---

## Prerequisites

| Requirement | Detail |
|-------------|--------|
| OS | CentOS Stream 9 / RHEL 9 / Rocky Linux 9 / AlmaLinux 9 (64-bit) |
| RAM | Minimum 1 GB (2 GB recommended) |
| Disk | 10 GB free |
| Network | Ports 80 and 443 open inbound |
| User | Non-root user with `sudo` / `wheel` group membership |

---

## Step 1 — Update the System

```bash
sudo dnf update -y
sudo dnf install -y curl wget git ca-certificates
```

---

## Step 2 — Install Docker Engine

RHEL-family systems use `dnf` and the Docker CE repository.

```bash
# Add Docker CE repository
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker CE
sudo dnf install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Start and enable Docker daemon
sudo systemctl start docker
sudo systemctl enable docker
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
```

---

## Step 3 — Configure SELinux (RHEL / Rocky / AlmaLinux)

RHEL-based systems run **SELinux** in enforcing mode by default. Docker volumes require the correct SELinux context to be readable by containers.

### Option A — Set correct SELinux label on volume directories (recommended)

```bash
# Label the proxy config and lua directories
sudo chcon -Rt svirt_sandbox_file_t /opt/b5/proxy/
sudo chcon -Rt svirt_sandbox_file_t /opt/b5/database/
```

### Option B — Use the `:z` or `:Z` volume flag in docker-compose.yml

Add `:z` to volume mounts to let Docker relabel automatically:

```yaml
volumes:
  - ./proxy/conf:/usr/local/openresty/nginx/conf/:z
  - ./proxy/lua:/usr/local/openresty/nginx/lua/:z
```

> Do **not** set SELinux to permissive mode in production — use one of the options above instead.

---

## Step 4 — Configure firewalld

RHEL-family systems use `firewalld` instead of `ufw`:

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload firewall
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

Expected output includes:

```
services: cockpit dhcpv6-client http https ssh
```

> **Do not expose** ports 5432 (PostgreSQL) or 6379 (Redis) to the public. Remove or restrict those port mappings in `docker-compose.yml` for any internet-facing server.

---

## Step 5 — Clone the Repository

```bash
sudo mkdir -p /opt/b5
sudo chown $USER:$USER /opt/b5
git clone https://github.com/your-org/b5.git /opt/b5
cd /opt/b5
```

---

## Step 6 — Configure Environment Variables

```bash
nano /opt/b5/.env
```

```ini
POSTGRES_USER=b5admin
POSTGRES_PASSWORD=change-this-strong-password
POSTGRES_DB=b5
REDIS_PASSWORD=change-this-redis-password
SECRET_KEY=generate-with-openssl-rand-hex-32
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## Step 7 — Start the Stack

```bash
cd /opt/b5
docker compose up -d
docker compose ps
```

Test the proxy:

```bash
curl -s http://localhost | grep "Welcome"
# <h1>Welcome to the Protected App</h1>

curl -o /dev/null -s -w "%{http_code}" \
  "http://localhost/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Step 8 — Set Up Automatic Start (systemd)

```bash
sudo nano /etc/systemd/system/b5.service
```

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable b5.service
sudo systemctl start b5.service
sudo systemctl status b5.service
```

---

## Step 9 — RHEL Subscription Notes (RHEL only)

If using Red Hat Enterprise Linux with a subscription, Docker CE is not supported by Red Hat. You have two options:

**Option A: Use Podman + Podman Compose (Red Hat supported)**

```bash
sudo dnf install -y podman podman-compose
podman-compose up -d
```

> Podman is a drop-in replacement for Docker with no daemon required. Most `docker` commands work with `podman` as a direct substitute.

**Option B: Use Docker CE anyway (not officially supported on RHEL)**

The steps above work on RHEL 9 in practice but Red Hat does not provide support for this configuration.

---

## Differences from Ubuntu Installation

| Step | Ubuntu | CentOS / RHEL |
|------|--------|---------------|
| Package manager | `apt` | `dnf` |
| Firewall | `ufw` | `firewalld` |
| SELinux | Not active by default | Enforcing by default — requires volume labels |
| Docker repository | `download.docker.com/linux/ubuntu` | `download.docker.com/linux/centos` |
| Podman alternative | Not default | Available and Red Hat supported |

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [ubuntu_install.md](ubuntu_install.md) | Ubuntu installation guide |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
| [aws_ec2_deploy.md](aws_ec2_deploy.md) | Deploy to AWS EC2 |
