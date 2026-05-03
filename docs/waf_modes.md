# B5 WAF — Learning, Logging, and Blocking Modes

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md), [request_lifecycle.md](request_lifecycle.md)

---

## 1. Overview

B5 WAF operates in one of three **policy modes**. The mode controls what happens when a security rule detects a suspicious request. Modes are set **per policy** and can be changed at any time without restarting the data plane.

The three modes are:

| Mode | Icon | Purpose |
|------|------|---------|
| **Learning** | 🎓 | Observe traffic, build baselines, suggest rules |
| **Logging** | 📋 | Detect and log violations without blocking traffic |
| **Blocking** | 🛡️ | Actively block malicious requests |

**Recommended rollout order:**

```
Learning Mode → Logging Mode → Blocking Mode
    (days/weeks)    (days/weeks)    (permanent)
```

Start in Learning or Logging mode to understand your traffic patterns before enabling Blocking mode.

---

## 2. Learning Mode

### What It Does

Learning mode is a **passive observation phase**. B5 watches all incoming traffic, records patterns, and uses this data to suggest WAF rules that are appropriate for your specific application — without ever blocking a request.

### When to Use It

- When you first deploy B5 in front of a new application.
- When your application has complex or unusual URL patterns (e.g., base64-encoded parameters, custom headers) that might trigger false positives.
- After a major application release when traffic patterns change significantly.

### What Happens to Requests

```
Incoming request
      │
      ▼
WAF rule check → match found?
      │
      ├─── YES → Record pattern data (do NOT block, do NOT generate alert)
      │           ┌─────────────────────────────────────────────────────┐
      │           │ Store in Redis: learn:{app_id}:path:{path}           │
      │           │ Increment observed pattern counter                   │
      │           │ FastAPI background job analyses data                  │
      │           │ → Generates suggested rules for admin review         │
      │           └─────────────────────────────────────────────────────┘
      │
      └─── NO  → Request passes through normally
      │
      ▼
proxy_pass → backend application (all requests pass through)
```

### What Is Recorded

B5 collects:
- URL paths and patterns seen in normal traffic.
- HTTP methods used per endpoint.
- Query parameter names and value formats.
- Content-Type values in POST requests.
- Typical User-Agent strings.
- Observed request frequencies (for rate limit baseline).

### Limitations

- **No protection** — if you are under active attack, switch to Logging or Blocking mode immediately.
- Requires sufficient traffic volume to build a meaningful baseline (typically 1–2 weeks for normal applications).
- Suggested rules still require human review before activation.

---

## 3. Logging Mode

### What It Does

Logging mode is a **detection-without-enforcement** phase. B5 runs all configured WAF rules, detects violations, and records them as security events — but does **not block** any traffic.

### When to Use It

- After Learning mode, when you have a set of rules you want to validate.
- When you need to tune rules to eliminate false positives before going live.
- For ongoing monitoring of an application that can't risk any legitimate traffic being blocked (e.g., a critical payment API during peak season).
- For compliance evidence: "We detect these attack types but have not yet enforced blocking."

### What Happens to Requests

```
Incoming request
      │
      ▼
IP blocklist check → blocked?
      ├─── YES → BLOCK (403) — explicit blocks still apply
      └─── NO  → continue

Rate limit check → exceeded?
      ├─── YES → RATE LIMIT (429) — rate limits still apply
      └─── NO  → continue

WAF rule check → match found?
      │
      ├─── YES → Generate security event (severity = rule severity)
      │           Log to OpenSearch with action = "logged"
      │           ⚠️  Request CONTINUES — not blocked
      │
      └─── NO  → Request passes through
      │
      ▼
proxy_pass → backend application
```

> **Note:** Even in Logging mode, **explicit IP blocklist entries** and **rate limits** are enforced. Only WAF rule matches are non-blocking in this mode.

### Using Logging Mode for Tuning

The typical tuning workflow:

1. Enable Logging mode with a new rule set.
2. Review the security events in the dashboard over 24–72 hours.
3. Identify **false positives**: events where the blocked URL is actually legitimate traffic.
4. Adjust the rule pattern to be more specific, or add the URL to an allowlist.
5. Repeat until false positive rate is acceptable (target: < 0.01% of requests).
6. Switch to Blocking mode.

---

## 4. Blocking Mode

### What It Does

Blocking mode is **full enforcement**. When a WAF rule matches a request, B5 terminates the request and returns an HTTP 403 Forbidden response. The backend application never sees the malicious request.

### When to Use It

- After completing a Logging mode tuning phase.
- For all production applications handling sensitive data.
- Immediately for applications with well-understood traffic patterns (e.g., a simple static website).

### What Happens to Requests

```
Incoming request
      │
      ▼
IP blocklist check → blocked?
      ├─── YES → BLOCK (403)
      └─── NO  → continue

IP reputation check → score >= threshold?
      ├─── YES → BLOCK (403)
      └─── NO  → continue

Rate limit check → exceeded?
      ├─── YES → RATE LIMIT (429)
      └─── NO  → continue

WAF rule check → match found?
      │
      ├─── YES (rule action = block)
      │     ├─── Generate security event (action = "blocked")
      │     └─── ngx.exit(403) — REQUEST TERMINATED
      │
      ├─── YES (rule action = log)
      │     ├─── Generate security event (action = "logged")
      │     └─── Request continues to proxy_pass
      │
      └─── NO  → Request passes through
      │
      ▼
proxy_pass → backend application (clean requests only)
```

### Emergency Override

In Blocking mode, if a legitimate request is being incorrectly blocked, an administrator can:

1. Add the client IP to the **allowlist** (`allow:{ip}` in Redis) for immediate relief.
2. Disable the specific rule from the dashboard.
3. Adjust the rule pattern and re-enable it.

Changes propagate to the data plane within seconds via Redis.

---

## 5. Mode Comparison Table

| Feature | Learning 🎓 | Logging 📋 | Blocking 🛡️ |
|---------|:-----------:|:----------:|:-----------:|
| WAF rules match and detect violations | ✅ | ✅ | ✅ |
| Violations are logged to OpenSearch | ✅ | ✅ | ✅ |
| Malicious requests are blocked (403) | ❌ | ❌ | ✅ |
| Rate limits enforced (429) | ❌ | ✅ | ✅ |
| Explicit IP blocklist enforced | ❌ | ✅ | ✅ |
| IP reputation enforcement | ❌ | ✅ | ✅ |
| Traffic pattern recording | ✅ | ❌ | ❌ |
| Rule suggestions generated | ✅ | ❌ | ❌ |
| Suitable during initial deployment | ✅ | ✅ | ⚠️ |
| Suitable for production protection | ❌ | ⚠️ | ✅ |
| Risk of false positive impact | None | None | Medium |

---

## 6. Switching Modes

Modes are changed via the dashboard or the API:

**Via API:**

```http
PUT /api/v1/policies/{id}/mode
Content-Type: application/json
Authorization: Bearer {token}

{
  "mode": "blocking"
}
```

**Via Dashboard:**
Navigate to **Policies** → select your policy → use the **Mode Selector** dropdown → click **Save**.

**Effect:** FastAPI writes the new mode to PostgreSQL and publishes the update to Redis key `b5:policy:mode:{policy_id}`. The data plane reads the new mode on the next request — **no Nginx reload required**.

---

## 7. Per-Rule Action vs. Policy Mode

Individual rules can have their own `action` field (`block`, `log`, `allow`). The **policy mode overrides rule actions** for blocking:

| Rule action | Policy mode | Result |
|------------|------------|--------|
| `block` | `blocking` | Request is blocked |
| `block` | `logging` | Request is logged only (not blocked) |
| `block` | `learning` | Request is allowed (pattern recorded) |
| `log` | any mode | Request is always logged but never blocked by this rule |
| `allow` | any mode | Request is always allowed (explicit bypass rule) |

This means you can safely deploy a full OWASP rule set in `logging` mode, observe the results, and switch to `blocking` mode when ready — without changing any individual rule configurations.

---

## 8. Recommended Deployment Process

```
Week 1-2: Learning Mode
  ├─ Deploy B5 in front of the application
  ├─ Review suggested rules generated from observed traffic
  └─ Activate the suggested rules in the policy

Week 3-4: Logging Mode
  ├─ Enable Logging mode with all configured rules
  ├─ Review security events daily in the dashboard
  ├─ Identify and resolve false positives
  │   ├─ Too broad pattern → refine the regex
  │   └─ Legitimate URL being flagged → add allowlist rule
  └─ Confirm false positive rate is < 0.01%

Week 5+: Blocking Mode
  ├─ Switch policy to Blocking mode
  ├─ Monitor dashboard closely for first 48 hours
  ├─ Keep rate limits and IP blocklist active
  └─ Perform weekly review of blocked events
```

---

## 9. Related Documentation

| Document | Description |
|---------|-------------|
| [request_lifecycle.md](request_lifecycle.md) | How mode affects the request lifecycle state diagram |
| [fastapi_control_plane.md](fastapi_control_plane.md) | API endpoint to change policy mode |
| [logging_pipeline.md](logging_pipeline.md) | What events are logged in each mode |
| [glossary.md](glossary.md) | Definitions for learning, logging, blocking |
