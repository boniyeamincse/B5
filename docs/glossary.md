# B5 WAF — Core Glossary

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

This glossary defines the core terms used throughout B5 WAF documentation. Terms are listed in logical order (concepts before implementations) rather than alphabetically.

---

## A

### Audit Log
A tamper-evident record of every configuration change made to B5 via the admin dashboard or API. Stored in PostgreSQL. Records who changed what, when, and what the previous and new values were. Used for compliance, incident investigation, and change tracking.

---

## B

### Backend Pool
The set of upstream server addresses that B5 forwards clean traffic to. In the simplest case, a backend pool contains a single server URL. In a load-balanced deployment, it contains multiple servers and B5 round-robins requests between them. Configured per-application in the PostgreSQL `applications` table.

### Blocking Mode
A B5 policy operating mode in which detected violations result in the request being **terminated** with an HTTP 403 Forbidden response. The backend application never receives the request. See [waf_modes.md](waf_modes.md).

### Bot Detection
The process of identifying automated traffic (bots, scrapers, crawlers, vulnerability scanners) based on behavioural signals such as high request frequency, unusual User-Agent strings, predictable URL crawling patterns, or absence of browser-specific headers. B5 uses rate limiting and IP reputation as the primary bot mitigation mechanisms in the MVP.

---

## C

### Control Plane
The administrative layer of B5. The control plane manages WAF configuration (rules, policies, applications, users) and exposes a REST API. It does not process live traffic — that is the data plane's responsibility. In B5, the control plane is implemented with **FastAPI**. See [fastapi_control_plane.md](fastapi_control_plane.md).

---

## D

### Data Plane
The traffic-processing layer of B5. The data plane intercepts every HTTP/HTTPS request, applies WAF rules, makes block/allow decisions, and proxies clean traffic to the backend. It must operate at high speed (sub-millisecond per request). In B5, the data plane is implemented with **OpenResty (Nginx + Lua)**. See [openresty_lua_interaction.md](openresty_lua_interaction.md).

---

## E

### Enforcement
The act of applying a security decision to live traffic. In **Blocking mode**, enforcement means returning a 403 response to a detected attack. In **Logging mode**, enforcement is passive — violations are recorded but requests are not blocked. Enforcement only occurs in Blocking mode.

---

## F

### False Negative
A security event that B5 **failed to detect**. A false negative means a malicious request passed through B5 and reached the backend application without being logged or blocked. False negatives are caused by attack patterns that do not match any configured rule, obfuscated payloads, or attack vectors not covered by the current rule set.

### False Positive
A security event where B5 **incorrectly identified a legitimate request as malicious** and blocked it. False positives cause disruption to real users. They are the most common reason to use Logging mode before enabling Blocking mode. Common causes: overly broad regex patterns, URLs that coincidentally match an attack signature. See [waf_modes.md](waf_modes.md).

---

## I

### IP Reputation
A score (0–100) assigned to an IP address representing its likelihood of being malicious. The score is calculated from internal violation history (number of recent blocks) and optionally from external threat intelligence feeds. High-reputation-score IPs are blocked in B5 before WAF rules are even evaluated. Scores are cached in Redis with a TTL. See [redis_rate_limiting.md](redis_rate_limiting.md).

---

## L

### Learning Mode
A B5 policy operating mode in which B5 passively observes traffic patterns without blocking any requests. It records observed URL paths, HTTP methods, parameter names, and request frequencies to generate suggested WAF rules tailored to the specific application. See [waf_modes.md](waf_modes.md).

### Logging Mode
A B5 policy operating mode in which WAF rules detect violations and log them as security events, but do **not block** traffic. Rate limits and explicit IP blocks are still enforced. Used to tune rules and identify false positives before enabling Blocking mode. See [waf_modes.md](waf_modes.md).

---

## O

### OWASP Top 10
The Open Web Application Security Project's list of the ten most critical web application security risks. B5 is designed to detect and mitigate all OWASP Top 10 attack categories, including:

1. Broken Access Control
2. Cryptographic Failures
3. Injection (SQL, Command, LDAP)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

B5 primarily addresses categories 3 (Injection), 7 (Brute Force), and 9 (Logging) at the reverse-proxy layer.

---

## P

### Policy
A named container for a set of WAF rules and an operating mode (learning/logging/blocking). Each protected application is linked to one policy. Policies allow you to apply different rule sets and strictness levels to different applications. For example, a marketing website may use a relaxed policy, while a payment API uses a strict one.

### Policy Mode
The operating state of a policy: `learning`, `logging`, or `blocking`. Changing the mode immediately affects how B5 responds to rule matches on all applications linked to that policy. See [waf_modes.md](waf_modes.md).

---

## R

### Rate Limiting
The practice of restricting how many requests a client (identified by IP address or API key) can make within a time window. B5 implements Redis-based rate limiting with per-IP and per-route counters. When the limit is exceeded, B5 returns HTTP 429 Too Many Requests. Used to prevent brute-force attacks, API abuse, and Layer 7 denial-of-service. See [redis_rate_limiting.md](redis_rate_limiting.md).

### Request Normalization
The process of decoding and standardising a request before applying security checks. Includes URL decoding (`%27` → `'`), double decoding, and whitespace normalization. Normalization is essential because attackers deliberately encode payloads to evade pattern matching. B5 performs normalization in Lua before any rule checks.

### Reverse Proxy
A server that sits in front of one or more backend servers and forwards incoming client requests to them. From the client's perspective, the reverse proxy is the destination — they never connect directly to the backend. B5 uses a reverse proxy architecture so it can inspect all traffic without modifying the backend application.

### Risk Score
A numeric score (0–100) calculated per security event representing the overall threat level of a detected request. It combines the rule severity, IP reputation score, rate limit violation flag, and recidivism (whether the IP is a repeat offender). Scores ≥ 80 trigger automatic blocking and high-priority dashboard alerts. See [logging_pipeline.md](logging_pipeline.md).

### Rule
An individual WAF detection unit. A rule consists of: a PCRE regex **pattern**, a **target** (which part of the request to inspect), an **action** (block/log/allow), and a **severity** level. Rules are grouped inside policies. When a rule's pattern matches the target value of an incoming request, the action is applied (subject to the policy mode).

---

## S

### Security Event
A structured JSON record generated by B5 whenever a security-relevant condition is detected: a rule match, a rate limit breach, an IP block, etc. Security events are written to OpenSearch for storage, search, and analytics. Every event includes the attack type, client IP, path, matched rule, action taken, and risk score. See [logging_pipeline.md](logging_pipeline.md).

### Signature
Synonymous with **rule** in WAF terminology. A signature is a pattern (usually a regex) that identifies a known attack payload. For example, the signature `(?i)union.*select` identifies SQL UNION SELECT injection attempts. B5 ships with built-in signatures for common OWASP Top 10 attacks and allows administrators to add custom signatures.

---

## V

### Virtual Server
A logical representation of a protected application within B5. It defines the `domain` (Host header) that B5 listens for and the `backend_url` to proxy clean traffic to. In B5, virtual servers are stored as rows in the PostgreSQL `applications` table and reflected in the Nginx configuration.

### Violation
Any request that matches a WAF rule, exceeds a rate limit, or is blocked by an IP reputation check. Violations are always logged as security events. In Blocking mode, violations result in the request being terminated. In Logging mode, violations are recorded but the request is passed through.

---

## W

### WAF (Web Application Firewall)
A security layer that monitors, filters, and blocks HTTP/HTTPS traffic to and from a web application based on a set of rules. A WAF operates at Layer 7 (the application layer) of the OSI model, allowing it to inspect the content of requests — not just their source IP and port. B5 is a WAF implemented as a reverse proxy.
