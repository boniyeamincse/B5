# B5 WAF — Deploying to AWS EC2 with Docker

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [ubuntu_install.md](ubuntu_install.md), [quickstart.md](quickstart.md)

---

## Overview

This guide walks through deploying B5 WAF to an **AWS EC2 instance** running Ubuntu 22.04 LTS. By the end you will have:

- B5 running on EC2 and accessible from the internet.
- The EC2 security group configured to allow HTTP/HTTPS traffic.
- B5 protecting a backend application (or the dummy test app).
- Automatic restart on reboot via systemd.

---

## Prerequisites

| Requirement | Detail |
|-------------|--------|
| AWS account | With permission to create EC2 instances and security groups |
| AWS CLI | Installed and configured (`aws configure`) — optional but useful |
| SSH key pair | Created in EC2 key pairs or locally with `ssh-keygen` |
| Instance type | `t3.micro` (free tier) minimum; `t3.small` or larger recommended for production |

---

## Step 1 — Launch an EC2 Instance

### Via AWS Console

1. Go to **EC2 → Instances → Launch Instance**.
2. **AMI:** Select **Ubuntu Server 22.04 LTS (HVM)** (64-bit x86).
3. **Instance type:** `t3.micro` (free tier eligible) or larger.
4. **Key pair:** Select an existing key pair or create a new one. Download the `.pem` file.
5. **Network settings:**
   - VPC: Default VPC is fine for testing.
   - **Security group:** Create a new security group. Add inbound rules:
     - SSH (port 22) — Source: **My IP** (do not allow `0.0.0.0/0` for SSH).
     - HTTP (port 80) — Source: `0.0.0.0/0` and `::/0`.
     - HTTPS (port 443) — Source: `0.0.0.0/0` and `::/0`.
6. **Storage:** 20 GB gp3 (default is sufficient).
7. Click **Launch Instance**.

### Via AWS CLI

```bash
# Replace key-name, subnet-id, and security-group-id with your values
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \      # Ubuntu 22.04 LTS us-east-1
  --instance-type t3.micro \
  --key-name your-key-pair-name \
  --security-group-ids sg-xxxxxxxxxx \
  --subnet-id subnet-xxxxxxxxxx \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=b5-waf}]'
```

> **Finding the latest Ubuntu 22.04 AMI for your region:**
> ```bash
> aws ec2 describe-images \
>   --owners 099720109477 \
>   --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
>   --query "sort_by(Images, &CreationDate)[-1].ImageId" \
>   --output text
> ```

---

## Step 2 — Connect to the Instance

```bash
# Replace with your instance's public IP and key file
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## Step 3 — Install Docker on the EC2 Instance

Follow the Ubuntu installation steps:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates

# Add Docker repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu
newgrp docker
docker run hello-world
```

---

## Step 4 — Clone B5 and Configure

```bash
sudo mkdir -p /opt/b5
sudo chown ubuntu:ubuntu /opt/b5
git clone https://github.com/your-org/b5.git /opt/b5
cd /opt/b5
```

Create the `.env` file with strong credentials:

```bash
cat > /opt/b5/.env << 'EOF'
POSTGRES_USER=b5admin
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=b5
REDIS_PASSWORD=<generate-strong-password>
SECRET_KEY=<output-of-openssl-rand-hex-32>
ACCESS_TOKEN_EXPIRE_MINUTES=60
EOF
```

Generate credentials:

```bash
openssl rand -hex 32    # for SECRET_KEY
openssl rand -base64 24 # for passwords
```

> **AWS tip:** Store sensitive values in **AWS Secrets Manager** or **SSM Parameter Store** rather than a `.env` file for production deployments. Reference them in your startup script.

---

## Step 5 — Restrict Unnecessary Port Exposure

Edit `docker-compose.yml` to remove the PostgreSQL and Redis host port mappings. These services should not be accessible from the internet:

```yaml
b5-postgres:
  # Remove or comment out:
  # ports:
  #   - "5432:5432"
  # Services on the same Docker network can still reach it internally.

b5-redis:
  # Remove or comment out:
  # ports:
  #   - "6379:6379"
```

---

## Step 6 — Start the Stack

```bash
cd /opt/b5
docker compose up -d
docker compose ps
```

Test from your local machine:

```bash
curl http://<EC2-PUBLIC-IP>
# <h1>Welcome to the Protected App</h1>

curl -o /dev/null -s -w "%{http_code}" \
  "http://<EC2-PUBLIC-IP>/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Step 7 — Set Up Automatic Start (systemd)

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
```

---

## Step 8 — Assign an Elastic IP (Optional but Recommended)

EC2 instances get a new public IP on each stop/start unless you use an Elastic IP.

```bash
# Allocate an Elastic IP
aws ec2 allocate-address --domain vpc

# Associate it with your instance (replace with your values)
aws ec2 associate-address \
  --instance-id i-xxxxxxxxxx \
  --allocation-id eipalloc-xxxxxxxxxx
```

Or use the AWS Console: **EC2 → Elastic IPs → Allocate → Associate**.

---

## Step 9 — Point a Domain to the EC2 Instance

In your DNS provider (Route 53, Cloudflare, etc.), create an **A record**:

```
yourdomain.com  →  <EC2-ELASTIC-IP>
```

Update B5's `b5.conf` to reflect the domain name:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # ...
}
```

Reload:

```bash
docker exec b5-proxy nginx -s reload
```

---

## AWS-Specific Security Recommendations

| Recommendation | Action |
|---------------|--------|
| Use an Elastic IP | Avoid IP changes on stop/start |
| Restrict SSH access | Security group: allow port 22 only from your IP |
| Remove public DB ports | Comment out 5432/6379 port mappings in docker-compose.yml |
| Enable EC2 termination protection | Prevent accidental deletion |
| Use IAM roles | For EC2 to access Secrets Manager — no credentials on disk |
| Enable CloudWatch | Stream Docker logs with the CloudWatch Logs agent |
| Use a NAT Gateway | Keep backend servers in private subnets |

---

## Cost Estimate (AWS us-east-1, 2026)

| Resource | Cost |
|----------|------|
| `t3.micro` instance (24/7) | ~$8/month |
| 20 GB gp3 storage | ~$1.60/month |
| Elastic IP (attached) | Free |
| Data transfer (outbound, first 100 GB) | ~$9/month |
| **Total** | **~$19/month** |

> Free tier: `t3.micro` is free for 12 months for new AWS accounts (750 hours/month).

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [ubuntu_install.md](ubuntu_install.md) | Base Ubuntu installation steps |
| [kubernetes_helm.md](kubernetes_helm.md) | Deploy B5 on Kubernetes |
| [troubleshooting.md](troubleshooting.md) | Common errors and fixes |
