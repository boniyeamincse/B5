# B5 WAF — Kubernetes Helm Chart Documentation

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Status:** Draft — Helm chart not yet published. This document describes the planned chart structure and deployment model.  
**Related:** [aws_ec2_deploy.md](aws_ec2_deploy.md), [quickstart.md](quickstart.md)

---

## Overview

This document describes how B5 WAF will be deployed on Kubernetes using a **Helm chart**. Helm allows you to install, upgrade, and manage B5 as a versioned, configurable release.

The Helm chart is currently in planning/draft phase. The Docker Compose deployment is the production-ready method today.

---

## Kubernetes Architecture

When deployed on Kubernetes, B5 runs as:

```
┌─────────────────────────────────────────────────┐
│                  Kubernetes Cluster              │
│                                                 │
│  ┌──────────────┐    ┌────────────────────┐     │
│  │  b5-proxy    │    │  b5-control-plane  │     │
│  │  Deployment  │    │  Deployment        │     │
│  │  (OpenResty) │    │  (FastAPI)         │     │
│  └──────┬───────┘    └────────────────────┘     │
│         │                                       │
│  ┌──────▼───────┐    ┌────────────────────┐     │
│  │  b5-proxy    │    │  PostgreSQL         │     │
│  │  Service     │    │  StatefulSet        │     │
│  │  (LoadBal.)  │    └────────────────────┘     │
│  └──────────────┘                               │
│                       ┌────────────────────┐    │
│                       │  Redis             │    │
│                       │  StatefulSet       │    │
│                       └────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| kubectl | 1.28+ | [kubernetes.io/docs](https://kubernetes.io/docs/tasks/tools/) |
| Helm | 3.14+ | [helm.sh/docs](https://helm.sh/docs/intro/install/) |
| Kubernetes cluster | 1.28+ | Minikube, k3s, EKS, GKE, or AKS |
| Container registry | Any | Docker Hub, ECR, GCR |

---

## Planned Helm Chart Structure

```
charts/b5/
├── Chart.yaml                  # Chart metadata and version
├── values.yaml                 # Default configuration values
├── templates/
│   ├── _helpers.tpl            # Template helper functions
│   ├── deployment-proxy.yaml   # b5-proxy Deployment
│   ├── deployment-api.yaml     # FastAPI control plane Deployment
│   ├── service-proxy.yaml      # LoadBalancer Service for b5-proxy
│   ├── service-api.yaml        # ClusterIP Service for control plane
│   ├── configmap-nginx.yaml    # nginx.conf and b5.conf as ConfigMap
│   ├── configmap-lua.yaml      # init.lua and access.lua as ConfigMap
│   ├── secret.yaml             # PostgreSQL and Redis credentials
│   ├── statefulset-postgres.yaml   # PostgreSQL StatefulSet
│   ├── statefulset-redis.yaml      # Redis StatefulSet
│   ├── pvc-postgres.yaml           # PersistentVolumeClaim for PostgreSQL
│   ├── ingress.yaml            # Optional Ingress (if using ingress controller)
│   └── hpa.yaml                # Horizontal Pod Autoscaler for b5-proxy
└── charts/                     # Sub-chart dependencies
```

---

## Chart.yaml

```yaml
apiVersion: v2
name: b5
description: B5 Web Application Firewall
type: application
version: 0.1.0
appVersion: "1.0.0"
home: https://github.com/your-org/b5
maintainers:
  - name: B5 Team
keywords:
  - waf
  - security
  - openresty
  - lua
dependencies:
  - name: postgresql
    version: "15.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: "19.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

---

## values.yaml (Default Values)

```yaml
# B5 Proxy (OpenResty)
proxy:
  replicaCount: 2
  image:
    repository: openresty/openresty
    tag: bullseye
    pullPolicy: IfNotPresent
  service:
    type: LoadBalancer
    httpPort: 80
    httpsPort: 443
  resources:
    requests:
      memory: "128Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "1000m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# FastAPI Control Plane
api:
  replicaCount: 1
  image:
    repository: your-org/b5-api
    tag: latest
    pullPolicy: IfNotPresent
  service:
    type: ClusterIP
    port: 8000
  env:
    ACCESS_TOKEN_EXPIRE_MINUTES: 60

# PostgreSQL (via Bitnami sub-chart)
postgresql:
  enabled: true
  auth:
    username: b5admin
    password: ""           # Set via --set or external secret
    database: b5
  primary:
    persistence:
      size: 10Gi
      storageClass: ""     # Use cluster default

# Redis (via Bitnami sub-chart)
redis:
  enabled: true
  auth:
    enabled: true
    password: ""           # Set via --set or external secret
  master:
    persistence:
      size: 2Gi

# Ingress (optional)
ingress:
  enabled: false
  className: nginx
  host: yourdomain.com
  tls:
    enabled: false
    secretName: b5-tls

# WAF Configuration
waf:
  mode: blocking          # learning | logging | blocking
  logLevel: warn
```

---

## Installation

### Step 1 — Add the B5 Helm Repository (when published)

```bash
helm repo add b5 https://your-org.github.io/b5-helm-charts
helm repo update
```

### Step 2 — Install from the local chart (current development method)

```bash
# Clone the repo
git clone https://github.com/your-org/b5.git
cd b5/charts

# Install with custom values
helm install b5-waf ./b5 \
  --namespace b5 \
  --create-namespace \
  --set postgresql.auth.password="$(openssl rand -base64 24)" \
  --set redis.auth.password="$(openssl rand -base64 24)" \
  --set api.env.SECRET_KEY="$(openssl rand -hex 32)"
```

### Step 3 — Verify the Deployment

```bash
# Check all pods are running
kubectl get pods -n b5

# Expected output:
# NAME                              READY   STATUS    RESTARTS
# b5-waf-proxy-7d4f9b8c-x2p9k      1/1     Running   0
# b5-waf-proxy-7d4f9b8c-k8m2j      1/1     Running   0
# b5-waf-api-5c6d7e8f-n3p4q        1/1     Running   0
# b5-waf-postgresql-0               1/1     Running   0
# b5-waf-redis-master-0             1/1     Running   0

# Check services
kubectl get svc -n b5

# Get the LoadBalancer external IP
kubectl get svc b5-waf-proxy -n b5 -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Step 4 — Test

```bash
EXTERNAL_IP=$(kubectl get svc b5-waf-proxy -n b5 \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl http://$EXTERNAL_IP
curl -o /dev/null -s -w "%{http_code}" \
  "http://$EXTERNAL_IP/?id=1'+UNION+SELECT+*+FROM+users--"
# 403
```

---

## Upgrading the Chart

```bash
# Pull latest chart and upgrade
helm upgrade b5-waf ./b5 \
  --namespace b5 \
  --reuse-values
```

The proxy pods roll out one at a time (zero downtime) due to the `RollingUpdate` deployment strategy.

---

## Uninstalling

```bash
helm uninstall b5-waf --namespace b5
kubectl delete namespace b5
```

> **Warning:** This deletes all B5 resources including the PersistentVolumeClaims. Back up the PostgreSQL database first if you need to preserve data.

---

## Using External Secrets (Production Recommendation)

Instead of passing passwords via `--set` (which may appear in shell history), use **Kubernetes Secrets** or **External Secrets Operator**:

```bash
# Create a secret manually
kubectl create secret generic b5-credentials \
  --namespace b5 \
  --from-literal=postgres-password="$(openssl rand -base64 24)" \
  --from-literal=redis-password="$(openssl rand -base64 24)" \
  --from-literal=secret-key="$(openssl rand -hex 32)"

# Reference in values.yaml via existingSecret
```

For production clusters, use **AWS Secrets Manager** with the External Secrets Operator, **HashiCorp Vault**, or **Kubernetes Sealed Secrets**.

---

## Horizontal Pod Autoscaling

The HPA scales the `b5-proxy` deployment based on CPU usage:

```yaml
# templates/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: b5-proxy-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: b5-proxy
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## Current Limitations (Draft Status)

| Limitation | Notes |
|-----------|-------|
| Chart not yet published | Use local chart from repo |
| Lua ConfigMap reload | Requires pod restart after config changes (no hot reload via ConfigMap yet) |
| SSL/TLS | Manual certificate management; cert-manager integration planned |
| No distributed Redis | Single Redis master; Redis Sentinel or Cluster planned for HA |

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [aws_ec2_deploy.md](aws_ec2_deploy.md) | Deploy to AWS EC2 using Docker Compose |
| [quickstart.md](quickstart.md) | Local Docker Compose quick start |
