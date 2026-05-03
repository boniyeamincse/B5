# 🧭 B5 WAF Dashboard Menu Structure

The B5 WAF Admin Dashboard features a multi-tiered, category-based navigation system designed for high-efficiency security operations.

## 🏗️ Navigation Overview
The sidebar is built with a **Glassmorphic** design language, utilizing `backdrop-filter` and `midnight-blue` transparency. It is organized into logical functional blocks that cover the entire lifecycle of WAF management.

---

### 1. 📊 DASHBOARD
*Core monitoring and real-time visibility.*
- **Overview**: High-level metrics (Blocked attacks, system health, traffic volume).
- **Security Summary**: Detailed breakdown of attack types and threat levels.
- **Traffic Summary**: Inbound/Outbound throughput and request distribution.
- **Active Alarms**: Critical system or security alerts requiring immediate attention.
- **System Health**: Resource usage (CPU, RAM, Redis, Postgres) and container status.

### 2. 🌐 APPLICATION MANAGEMENT
*Infrastructure and target configuration.*
- **Applications**: Manage protected web applications and domains.
- **Backend Servers**: Configure upstream origin servers.
- **Backend Pools**: Group servers for load balancing and health checking.
- **Virtual Hosts**: Nginx-level host configuration and routing.
- **TLS / SSL Certificates**: Manage Let's Encrypt and custom SSL certs.
- **Deployment Status**: Track configuration synchronization across proxy nodes.

### 3. 🛡️ WAF POLICY MANAGEMENT
*High-level security behavior.*
- **Security Policies**: Create and assign global security profiles.
- **Policy Templates**: Reusable baseline configurations (OWASP, Strict, API).
- **Learning Mode**: Transparent traffic inspection for baseline building.
- **Blocking / Logging Mode**: Global enforcement toggles.
- **Policy Suggestions**: AI-driven rule recommendations based on traffic.

### 4. 📝 RULE MANAGEMENT
*Granular traffic inspection signatures.*
- **Attack Signatures**: Manage the 5000+ default threat patterns.
- **Custom Rules**: Create user-defined regex and pattern matches.
- **Rule Groups**: Logical grouping of rules for easy assignment.
- **Allowlist / Blocklist**: Permanent IP and path overrides.

### 5. 🤖 API SECURITY
*Specialized protection for REST/GraphQL.*
- **API Inventory**: Discovery of shadow and managed APIs.
- **JSON Inspection**: Depth and structure validation for JSON payloads.
- **Schema Validation**: Enforce OpenAPI/Swagger schemas.
- **Token Abuse**: Detection of malformed or stolen JWT/API keys.

### 6. 🚦 RATE LIMITING
*Traffic shaping and DoS protection.*
- **Global / Per-IP Limits**: Broad protection against volumetric attacks.
- **Per-Route Limits**: Granular protection for expensive endpoints (e.g., `/search`).
- **Login Protection**: Specialized brute-force mitigation for `/login`.

### 7. 🕵️ SECURITY EVENTS
*Forensics and audit trailing.*
- **Event Logs**: Full-text searchable logs of all WAF decisions.
- **Blocked Requests**: Deep dive into intercepted malicious payloads.
- **Attack Timeline**: Visual representation of attack clusters over time.
- **Export Logs**: CSV/PDF/JSON export for compliance reporting.

---

## 🛠️ UI Features
- **Expandable Categories**: Reduces visual clutter by grouping sub-items.
- **Active Route Highlighting**: Cyan glow indicator for the current page.
- **Live Status Pulse**: Visual confirmation of the WAF Core Engine state.
- **Custom Scrollbar**: Optimized for extensive menu structures.



B5 WAF Dashboard
│
├── DASHBOARD
│   ├── Overview
│   ├── Security Summary
│   ├── Traffic Summary
│   ├── Active Alarms
│   └── System Health
│
├── APPLICATION MANAGEMENT
│   ├── Applications
│   ├── Backend Servers
│   ├── Backend Pools
│   ├── Virtual Hosts
│   ├── TLS / SSL Certificates
│   └── Deployment Status
│
├── WAF POLICY MANAGEMENT
│   ├── Security Policies
│   ├── Policy Templates
│   ├── Learning Mode
│   ├── Logging Mode
│   ├── Blocking Mode
│   ├── Policy Suggestions
│   └── Policy Versions
│
├── RULE MANAGEMENT
│   ├── Attack Signatures
│   ├── Custom Rules
│   ├── Rule Groups
│   ├── Allowlist Rules
│   ├── Blocklist Rules
│   ├── Rule Exceptions
│   └── Rule Testing
│
├── THREAT PROTECTION
│   ├── OWASP Top 10
│   ├── SQL Injection Protection
│   ├── XSS Protection
│   ├── Command Injection Protection
│   ├── Path Traversal Protection
│   ├── File Upload Protection
│   ├── API Abuse Protection
│   └── Bot Protection
│
├── API SECURITY
│   ├── API Inventory
│   ├── API Endpoints
│   ├── JSON Inspection
│   ├── Schema Validation
│   ├── Token Abuse Detection
│   ├── Method Enforcement
│   └── API Rate Limits
│
├── RATE LIMITING
│   ├── Global Rate Limits
│   ├── Per-IP Rate Limits
│   ├── Per-Route Rate Limits
│   ├── Login Protection
│   ├── Brute Force Rules
│   └── Temporary Blocks
│
├── IP REPUTATION
│   ├── IP Blocklist
│   ├── IP Allowlist
│   ├── Reputation Scores
│   ├── Geo Blocking
│   ├── Suspicious IPs
│   └── Temporary IP Bans
│
├── SECURITY EVENTS
│   ├── Event Logs
│   ├── Blocked Requests
│   ├── Allowed Requests
│   ├── High Risk Events
│   ├── Attack Timeline
│   ├── Forensics
│   └── Export Logs
│
├── MONITORING
│   ├── Live Traffic
│   ├── Request Analytics
│   ├── Backend Health
│   ├── Latency Monitor
│   ├── Error Rates
│   ├── Top URLs
│   └── Top Attackers
│
├── REPORTS
│   ├── Daily Security Report
│   ├── Weekly Security Report
│   ├── Monthly Security Report
│   ├── Compliance Report
│   ├── OWASP Report
│   └── Custom Reports
│
├── SYSTEM SETTINGS
│   ├── General Settings
│   ├── Network Settings
│   ├── Proxy Settings
│   ├── Logging Settings
│   ├── Notification Settings
│   ├── Email / SMTP Settings
│   ├── Backup & Restore
│   └── License / Version
│
├── USER MANAGEMENT
│   ├── Admin Users
│   ├── Roles & Permissions
│   ├── API Tokens
│   ├── Login Sessions
│   └── Audit Logs
│
└── HELP
    ├── Documentation
    ├── Setup Guide
    ├── API Reference
    ├── Troubleshooting
    └── About B5