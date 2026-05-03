# B5 WAF — Prerequisites for Local Development

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [quickstart.md](quickstart.md)

---

## Overview

This document lists every tool required to develop, run, and contribute to the B5 WAF project locally. B5 has four components — each with its own toolchain requirements.

| Component | Runtime | Tool needed |
|-----------|---------|-------------|
| Data Plane (OpenResty) | Docker | Docker Engine + Compose |
| Control Plane (FastAPI) | Python 3.11+ | Python, pip, virtualenv |
| Frontend Dashboard (Next.js) | Node.js 20+ | Node.js, npm/pnpm |
| Database / Cache | Docker | Docker Engine (same as above) |

For **Docker-only development** (running everything in containers), only Docker and Git are required. Python and Node.js are only needed if you want to run the backend or frontend outside Docker for active development.

---

## 1. Git

Git is required to clone the repository and contribute changes.

### Install

```bash
# Ubuntu / Debian
sudo apt install git

# CentOS / RHEL / Fedora
sudo dnf install git

# macOS (via Homebrew)
brew install git

# Windows
# Download from https://git-scm.com/download/win
```

### Verify

```bash
git --version
# git version 2.43.0
```

**Minimum version:** 2.30+

---

## 2. Docker Engine

Docker runs all B5 services as containers. It is the only hard requirement for running the full stack.

### Install on Ubuntu 24.04 / 22.04

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Add Docker's official GPG key and repository
sudo apt update
sudo apt install ca-certificates curl
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
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Install on macOS

Download and install **Docker Desktop** from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Docker Compose V2 is included.

### Install on Windows

Download and install **Docker Desktop** from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Enable WSL2 backend when prompted for best performance.

### Post-install: Run Docker without sudo (Linux only)

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Log out and back in for the group change to take effect.

### Verify

```bash
docker --version
# Docker version 26.1.0

docker compose version
# Docker Compose version v2.27.0
```

**Minimum versions:** Docker Engine 24.0+, Docker Compose 2.20+

---

## 3. Python 3.11+

Required only if developing or running the FastAPI control plane **outside Docker**.

### Install on Ubuntu / Debian

```bash
sudo apt install python3.11 python3.11-venv python3-pip
```

### Install on macOS (via Homebrew)

```bash
brew install python@3.11
```

### Install on Windows

Download from [python.org/downloads](https://www.python.org/downloads/). Check **"Add Python to PATH"** during installation.

### Use pyenv for version management (recommended)

`pyenv` lets you switch between Python versions without affecting the system Python.

```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to shell profile (~/.bashrc or ~/.zshrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install Python 3.11
pyenv install 3.11.9
pyenv global 3.11.9
```

### Verify

```bash
python3 --version
# Python 3.11.9

pip3 --version
# pip 24.0
```

**Minimum version:** Python 3.11+

### Setting up a virtual environment

Always use a virtual environment for Python projects to avoid dependency conflicts:

```bash
cd B5/backend

python3 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

pip install -r requirements.txt
```

To deactivate:

```bash
deactivate
```

---

## 4. Node.js 20+ (LTS)

Required only if developing or running the Next.js dashboard **outside Docker**.

### Install via nvm (recommended — works on macOS and Linux)

`nvm` (Node Version Manager) lets you install and switch Node.js versions easily.

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc   # or ~/.zshrc

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

### Install on Ubuntu without nvm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

### Install on Windows

Download the **LTS installer** from [nodejs.org](https://nodejs.org/).

### Verify

```bash
node --version
# v20.14.0

npm --version
# 10.7.0
```

**Minimum version:** Node.js 20 LTS

### Optional: pnpm (faster package manager)

```bash
npm install -g pnpm
pnpm --version
# 9.1.0
```

---

## 5. Summary Checklist

Run through this checklist before starting development:

```bash
# Git
git --version              # ≥ 2.30

# Docker
docker --version           # ≥ 24.0
docker compose version     # ≥ 2.20
docker run hello-world     # verifies daemon is running

# Python (backend dev only)
python3 --version          # ≥ 3.11
pip3 --version

# Node.js (frontend dev only)
node --version             # ≥ 20.0
npm --version
```

All checks pass? You are ready to follow the [Quick Start guide](quickstart.md).

---

## 6. IDE Recommendations

| IDE | Extensions |
|-----|-----------|
| **VS Code** | Docker, Python, ESLint, Prettier, Lua (sumneko), REST Client |
| **PyCharm** | Built-in Python support; install Docker plugin |
| **WebStorm** | Built-in Node.js / React support |

### Recommended VS Code extensions for B5 development

```bash
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-python.python
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension sumneko.lua
```

---

## 7. Related Documentation

| Document | Description |
|---------|-------------|
| [quickstart.md](quickstart.md) | Get B5 running in 10 minutes |
| [ubuntu_install.md](ubuntu_install.md) | Full Ubuntu server installation |
| [troubleshooting.md](troubleshooting.md) | Common setup errors and fixes |
