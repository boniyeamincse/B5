# B5 WAF - Development Tasks Roadmap

This document is the single source of truth for all B5 WAF development tasks.
It covers the OpenResty proxy, FastAPI backend, Next.js frontend, testing, and DevOps.
Tasks are added as the project grows — numbering continues beyond 100.

> **Legend:** `[x]` = complete and committed · `[ ]` = pending

---

## 🛡️ Data Plane: Proxy & Core Engine (Lua / OpenResty)

- [x] 1. Enhance `init.lua` to load WAF configuration from environment variables.
- [x] 2. Implement Redis connection pooling in `init.lua` for high performance.
- [x] 3. Write Lua module for extracting request metadata (IP, headers, URI, method).
- [x] 4. Implement IP Allowlist/Blocklist checking logic against Redis.
- [x] 5. Write SQL Injection (SQLi) detection logic using regex patterns.
- [x] 6. Write Cross-Site Scripting (XSS) detection logic.
- [x] 7. Implement Command Injection detection logic.
- [x] 8. Implement Path Traversal (Directory Climbing) detection logic.
- [x] 9. Write Lua logic to inspect HTTP POST bodies for malicious payloads.
- [x] 10. Implement file upload inspection (multipart/form-data) for forbidden extensions.
- [x] 11. Develop the Rate Limiting core using the Redis sliding window algorithm.
- [x] 12. Implement route-specific rate limiting logic.
- [x] 13. Write JSON validation logic for `application/json` API requests.
- [x] 14. Create the Learning Mode script to safely log traffic without blocking.
- [x] 15. Write a custom Lua logger to format blocked events as JSON.
- [x] 16. Implement asynchronous log shipping from Lua to Elasticsearch.
- [x] 17. Add a feature to generate dynamic Risk Scores per IP based on violations.
- [x] 18. Create the custom HTML template engine for the 403 Access Denied page.
- [x] 19. Write Lua script to handle custom CORS headers dynamically.
- [x] 20. Implement automated proxy health checks and failover routing.

---

## 🗄️ Database Schema & Migrations (PostgreSQL / Alembic)

- [x] 21. Set up SQLAlchemy ORM and Alembic migration environment.
- [x] 22. Create the User model with secure password storage.
- [x] 23. Create the Rule model with fields for name, type, and pattern.
- [x] 24. Create the Policy model to group rules by application.
- [x] 25. Create the RateLimitConfig model for database-backed rate shaping.
- [x] 26. Create the EndpointConfig model for API strict-mode whitelisting.
- [x] 27. Create the AuditLog model to track admin dashboard changes.
- [x] 28. Write initial Alembic migration for base schema.
- [x] 29. Write seeder script to populate default OWASP Top 10 rules.
- [x] 30. Implement database indexing for fast rule lookups.
- [ ] 101. Create Application model (name, domain, upstream_url, enabled).
- [ ] 102. Create BackendServer model (host, port, weight, health_status, pool_id FK).
- [ ] 103. Create ServerPool model (name, lb_algorithm, application_id FK).
- [ ] 104. Create ApiToken model (name, token_hash, user_id FK, expires_at, last_used).
- [ ] 105. Create GeoBlock model (country_code, action, reason, enabled).
- [ ] 106. Write Alembic migration for Application, BackendServer, ServerPool, ApiToken, GeoBlock.

---

## ⚙️ Control Plane: Backend Core (Python / FastAPI)

- [x] 31. Initialize FastAPI application with custom metadata (Title, Version).
- [x] 32. Configure CORS middleware for the Next.js frontend domain.
- [x] 33. Set up database dependency injection (get_db).
- [x] 34. Implement password hashing using bcrypt.
- [x] 35. Implement JWT generation and token validation for Admin Auth.
- [x] 36. Write Pydantic schema for UserCreate and UserResponse.
- [x] 37. Write Pydantic schema for RuleCreate and RuleUpdate.
- [x] 38. Implement background task queue (Celery/Redis) for async operations.
- [x] 39. Write the Rule Sync service to push PostgreSQL rules to Redis for the proxy.
- [x] 40. Develop the IP Reputation service that pulls threat intel feeds.
- [x] 41. Write a service to aggregate daily security statistics from Elasticsearch.
- [x] 42. Implement a unified error handling and exception formatting middleware.
- [x] 43. Write logging configuration (structlog) for backend traceability.
- [x] 44. Set up environment variable validation using Pydantic BaseSettings.
- [x] 45. Create a health check endpoint /health for Docker Compose.

---

## 🔌 Backend API Routes — Phase 1

- [x] 46. Build POST /api/v1/auth/login (Admin Login — JWT token response).
- [x] 47. Build GET /api/v1/auth/me (Get current user profile).
- [x] 48. Build GET /api/v1/rules (List all rules with pagination).
- [x] 49. Build POST /api/v1/rules (Create a new custom rule).
- [x] 50. Build PATCH /api/v1/rules/{id} (Update an existing rule).
- [x] 51. Build DELETE /api/v1/rules/{id} (Delete a rule).
- [x] 52. Build GET /api/v1/analytics/overview (Dashboard stats: rule counts, health).
- [x] 53. Build GET /api/v1/analytics/events (Paginated AuditLog feed with filters).
- [x] 54. Build POST /api/v1/policies/sync (Trigger sync of active rules to Redis proxy).
- [x] 55. Build GET /api/v1/ratelimits (List active rate-limit configs).
- [x] 56. Build POST /api/v1/ratelimits (Create a new rate-limit config).

---

## 🔌 Backend API Routes — Phase 2

- [ ] 107. Add JWT get_current_user guard to GET /api/v1/rules and all rules endpoints.
- [ ] 108. Build GET /api/v1/policies (List all policies).
- [ ] 109. Build POST /api/v1/policies (Create a policy).
- [ ] 110. Build PATCH /api/v1/policies/{id} (Update a policy name/description).
- [ ] 111. Build DELETE /api/v1/policies/{id} (Delete a policy).
- [ ] 112. Build GET /api/v1/policies/{id}/rules (List rules attached to a policy).
- [ ] 113. Build PATCH /api/v1/ratelimits/{id} (Update a rate-limit config).
- [ ] 114. Build DELETE /api/v1/ratelimits/{id} (Delete a rate-limit config).
- [ ] 115. Build GET /api/v1/endpoint-configs (List endpoint strict-mode configs).
- [ ] 116. Build POST /api/v1/endpoint-configs (Create endpoint config).
- [ ] 117. Build PATCH /api/v1/endpoint-configs/{id} (Update endpoint config).
- [ ] 118. Build DELETE /api/v1/endpoint-configs/{id} (Delete endpoint config).
- [ ] 119. Build GET /api/v1/users (List admin users — superadmin only).
- [ ] 120. Build POST /api/v1/users (Create admin user).
- [ ] 121. Build PATCH /api/v1/users/{id} (Update user or change password).
- [ ] 122. Build DELETE /api/v1/users/{id} (Deactivate user).
- [ ] 123. Build GET /api/v1/applications (List applications).
- [ ] 124. Build POST /api/v1/applications (Create application).
- [ ] 125. Build PATCH /api/v1/applications/{id} (Update application).
- [ ] 126. Build DELETE /api/v1/applications/{id} (Delete application).
- [ ] 127. Build GET /api/v1/servers (List backend servers).
- [ ] 128. Build POST /api/v1/servers (Add backend server).
- [ ] 129. Build PATCH /api/v1/servers/{id} (Update server weight/health).
- [ ] 130. Build DELETE /api/v1/servers/{id} (Remove backend server).
- [ ] 131. Build GET /api/v1/pools (List server pools).
- [ ] 132. Build POST /api/v1/pools (Create server pool).
- [ ] 133. Build GET /api/v1/geo-blocks (List geo-block country rules).
- [ ] 134. Build POST /api/v1/geo-blocks (Add geo-block rule).
- [ ] 135. Build DELETE /api/v1/geo-blocks/{id} (Remove geo-block rule).
- [ ] 136. Build GET /api/v1/api-tokens (List API tokens for current user).
- [ ] 137. Build POST /api/v1/api-tokens (Generate new API token).
- [ ] 138. Build DELETE /api/v1/api-tokens/{id} (Revoke API token).
- [ ] 139. Build GET /api/v1/audit-logs (Paginated audit log with resource_type/user filters).
- [ ] 140. Build GET /api/v1/analytics/top-attackers (Top N attacker IPs by hit count).
- [ ] 141. Build GET /api/v1/analytics/top-urls (Top N attacked URL paths).
- [ ] 142. Build GET /api/v1/analytics/traffic-timeline (Req/block counts per hour, last 24h).
- [ ] 143. Build GET /api/v1/analytics/attack-breakdown (Blocked counts grouped by rule type).
- [ ] 144. Build GET /api/v1/health/backend-servers (Live upstream health status).
- [ ] 145. Build POST /api/v1/rules/test (Test a pattern against a sample payload string).
- [ ] 146. Build POST /api/v1/rules/bulk (Import multiple rules at once from JSON).
- [ ] 147. Build GET /metrics (Prometheus metrics via prometheus-fastapi-instrumentator).
- [ ] 148. Build WebSocket WS /api/v1/live-traffic for real-time event streaming to frontend.

---

## 🎨 Frontend — Shared UI Components & Infrastructure

- [x] 57. Initialize Next.js 14 project with App Router and TypeScript.
- [x] 58. Configure Tailwind CSS with B5 brand colors (Electric Cyan #00ffff, Midnight Blue).
- [x] 59. Install and configure Shadcn UI primitive components.
- [x] 60. Build the base Layout component (collapsible Sidebar + Navbar).
- [x] 61. Create the Button component with micro-animations.
- [x] 62. Build shared Input, Select, Textarea form primitives (Shadcn-based, dark-themed).
- [x] 63. Build the DataTable component with column sorting, pagination, row actions.
- [x] 64. Build the Modal / Dialog component for create/edit forms.
- [x] 65. Create the StatCard component (icon, value, trend arrow, percentage).
- [x] 66. Install Recharts and create the TrafficLineChart wrapper component.
- [x] 67. Build the AttackBarChart wrapper component (horizontal bars, custom colors).
- [x] 68. Build the DonutChart wrapper component (attack type breakdown with legend).
- [ ] 69. Create the RiskBadge component (CRITICAL / HIGH / MEDIUM / LOW / NONE variants).
- [ ] 70. Implement Toast notification system (success, error, warning, info).
- [ ] 71. Set up Zustand store for global auth state (token, user object, logout action).
- [ ] 72. Create lib/api.ts — centralized Axios API client with JWT Bearer injection and 401 redirect.
- [ ] 73. Add React Query (@tanstack/react-query) for server-state caching and refetching.
- [ ] 74. Implement Dark/Light mode toggle with next-themes persistence.

---

## 🔐 Frontend — Authentication Flow

- [ ] 75. Build /login page — glassmorphic card, username/password form, calls POST /api/v1/auth/login.
- [ ] 76. Implement JWT session persistence (httpOnly cookie via API route or localStorage via Zustand).
- [ ] 77. Add middleware.ts route guard — redirect unauthenticated users to /login.
- [ ] 78. Wire /auth/forgot-password page form to POST /api/v1/auth/forgot-password.
- [ ] 79. Wire /auth/reset-password page form to POST /api/v1/auth/reset-password.

---

## 🖥️ Frontend — Dashboard: Overview & Analytics

- [x] 80. Build /dashboard Overview page (StatCards, attack breakdown bars, top attackers, events table — mock data).
- [ ] 81. Wire /dashboard StatCards to GET /api/v1/analytics/overview (live rule counts).
- [ ] 82. Wire attack breakdown section to GET /api/v1/analytics/attack-breakdown.
- [ ] 83. Wire top attackers panel to GET /api/v1/analytics/top-attackers.
- [ ] 84. Wire recent events table to GET /api/v1/analytics/events.
- [ ] 85. Build /dashboard/security-summary — security KPIs, threat trend TrafficLineChart (24h), top rule triggers.
- [ ] 86. Build /dashboard/traffic-summary — req/sec LineChart, HTTP status code BarChart, bandwidth stats.
- [ ] 87. Build /dashboard/analytics — full analytics hub with date-range picker and chart grid.
- [ ] 88. Build /dashboard/top-attackers — sortable DataTable wired to GET /api/v1/analytics/top-attackers.
- [ ] 89. Build /dashboard/top-urls — sortable DataTable wired to GET /api/v1/analytics/top-urls.
- [ ] 90. Build /dashboard/timeline — hourly attack TrafficLineChart wired to GET /api/v1/analytics/traffic-timeline.
- [ ] 91. Build /dashboard/live-traffic — real-time request feed via WebSocket (WS /api/v1/live-traffic).
- [ ] 92. Build /dashboard/latency — upstream response time LineChart from backend health data.
- [ ] 93. Build /dashboard/error-rates — 4xx/5xx error rate BarChart over time.
- [ ] 94. Build /dashboard/backend-health — upstream health status cards wired to GET /api/v1/health/backend-servers.
- [ ] 95. Build /dashboard/alarms — configurable threshold alerts list with status indicators.
- [ ] 96. Build /dashboard/forensics — per-IP deep-dive: event history timeline, risk score, all matched rules.
- [ ] 97. Build /dashboard/blocked — paginated DataTable of all blocked requests with filters.
- [ ] 98. Build /dashboard/allowed — paginated DataTable of all allowed requests.
- [ ] 99. Build /dashboard/health — system health page (proxy, DB, Redis, Elasticsearch status cards).

---

## 🖥️ Frontend — Dashboard: Security Events

- [x] 100. Build /dashboard/events base page (mock DataTable, severity RiskBadges, rule column).
- [ ] 149. Wire /dashboard/events DataTable to GET /api/v1/analytics/events (pagination, live data).
- [ ] 150. Add severity filter, search bar, and date-range picker to /dashboard/events.
- [ ] 151. Add event detail side-drawer (full request headers, raw payload, matched rule pattern).
- [ ] 152. Build /dashboard/audit-logs — admin action history DataTable wired to GET /api/v1/audit-logs.
- [ ] 153. Build /dashboard/exceptions — whitelist management for false-positive request patterns.

---

## 🖥️ Frontend — Dashboard: Rule Management

- [x] 154. Build /dashboard/rules base stub page (placeholder card created).
- [ ] 155. Rebuild /dashboard/rules — full DataTable wired to GET /api/v1/rules with search and type filter.
- [ ] 156. Add Create Rule modal (name, type, pattern, action dropdowns) wired to POST /api/v1/rules.
- [ ] 157. Add Edit Rule modal wired to PATCH /api/v1/rules/{id}.
- [ ] 158. Add Delete Rule confirmation dialog wired to DELETE /api/v1/rules/{id}.
- [ ] 159. Add enable/disable toggle switch per rule row wired to PATCH /api/v1/rules/{id} enabled field.
- [ ] 160. Build /dashboard/owasp — OWASP Top 10 category cards with enable/disable per category.
- [ ] 161. Build /dashboard/signatures — custom signature pattern library with search.
- [ ] 162. Build /dashboard/rule-groups — group rules by type with bulk enable/disable toggle.
- [ ] 163. Build /dashboard/rule-testing — live tester: paste payload + select rule, see match result via POST /api/v1/rules/test.

---

## 🖥️ Frontend — Dashboard: Policy Management

- [ ] 164. Build /dashboard/policies — DataTable wired to GET /api/v1/policies.
- [ ] 165. Add create/edit/delete policy modal forms wired to Policy Phase 2 endpoints.
- [ ] 166. Add policy detail view showing attached rules with enable/disable per rule.
- [ ] 167. Add Sync to Proxy button wired to POST /api/v1/policies/sync with toast feedback.
- [ ] 168. Build /dashboard/policy-templates — read-only preset policy templates (OWASP, API, Strict).
- [ ] 169. Build /dashboard/policy-versions — version history of policy changes from audit log.
- [ ] 170. Build /dashboard/policy-suggestions — heuristic-suggested rules from unblocked suspicious traffic.

---

## 🖥️ Frontend — Dashboard: Attack Protection Config Pages

- [ ] 171. Build /dashboard/sqli — SQLi config (enable, sensitivity slider, custom pattern list).
- [ ] 172. Build /dashboard/xss — XSS protection config (same UX pattern as sqli page).
- [ ] 173. Build /dashboard/cmdi — Command Injection config (enable, blocked commands list).
- [ ] 174. Build /dashboard/path-traversal — Path Traversal config (enable, allowed paths exceptions).
- [ ] 175. Build /dashboard/file-upload — File upload config (forbidden extensions list, max size).
- [ ] 176. Build /dashboard/bot-protection — bot detection config (known bad UAs, challenge mode toggle).
- [ ] 177. Build /dashboard/brute-force — brute-force config (max attempts, lockout duration, affected routes).
- [ ] 178. Build /dashboard/login-protection — login endpoint rate limits + CAPTCHA toggle.

---

## 🖥️ Frontend — Dashboard: Rate Limiting & IP Control

- [ ] 179. Build /dashboard/rate-limits — DataTable wired to GET /api/v1/ratelimits with full CRUD.
- [ ] 180. Add create/edit/delete rate-limit modals wired to Phase 2 rate-limit endpoints.
- [ ] 181. Build /dashboard/ip-rate-limits — IP-specific rate limit override management.
- [ ] 182. Build /dashboard/route-rate-limits — per-route rate limit override management.
- [ ] 183. Build /dashboard/ip-blocklist — manual IP/CIDR block list with add/remove controls.
- [ ] 184. Build /dashboard/ip-allowlist — manual IP/CIDR allow list with add/remove controls.
- [ ] 185. Build /dashboard/ip-bans — permanent IP ban table with reason, operator, and timestamp.
- [ ] 186. Build /dashboard/blocklist — combined blocklist view (IPs, CIDRs, ASNs, countries).
- [ ] 187. Build /dashboard/allowlist — combined allowlist view.
- [ ] 188. Build /dashboard/temp-blocks — auto-temporary-block list with per-row expiry countdown.
- [ ] 189. Build /dashboard/suspicious-ips — IPs flagged by risk scorer with risk score bar.
- [ ] 190. Build /dashboard/high-risk — IPs with risk score >= 80 with one-click Ban IP action.

---

## 🖥️ Frontend — Dashboard: Threat Intelligence & Geo

- [ ] 191. Build /dashboard/geo-blocking — country block/allow list wired to GET /api/v1/geo-blocks.
- [ ] 192. Add create/delete geo-block rules wired to geo-blocks Phase 2 endpoints.
- [ ] 193. Build /dashboard/reputation — IP reputation score viewer with external feed status.
- [ ] 194. Build /dashboard/sessions — active session tracking table with forced-logout action.
- [ ] 195. Build /dashboard/token-abuse — API token abuse detection alerts with revoke action.

---

## 🖥️ Frontend — Dashboard: API Security

- [ ] 196. Build /dashboard/api-endpoints — auto-discovered API endpoint inventory DataTable.
- [ ] 197. Build /dashboard/api-rate-limits — per-endpoint, per-token rate limit configuration.
- [ ] 198. Build /dashboard/api-abuse — API abuse pattern detection alerts.
- [ ] 199. Build /dashboard/schema-validation — JSON schema validation rules per endpoint with test tool.
- [ ] 200. Build /dashboard/method-enforcement — HTTP method whitelist per endpoint wired to EndpointConfig API.
- [ ] 201. Build /dashboard/api-tokens — API token management wired to GET/POST/DELETE /api/v1/api-tokens.

---

## 🖥️ Frontend — Dashboard: WAF Mode Controls

- [ ] 202. Build /dashboard/blocking-mode — global WAF mode toggle (Blocking / Monitoring / Off) with confirmation.
- [ ] 203. Build /dashboard/logging-mode — configure log verbosity and which event types are stored.
- [ ] 204. Build /dashboard/learning — learning mode dashboard with suggested rules from traffic analysis.

---

## 🖥️ Frontend — Dashboard: Application & Infrastructure Management

- [ ] 205. Build /dashboard/apps — application management DataTable wired to GET /api/v1/applications.
- [ ] 206. Add create/edit/delete application modals wired to Applications Phase 2 endpoints.
- [ ] 207. Build /dashboard/servers — backend server management wired to GET /api/v1/servers.
- [ ] 208. Add create/edit/delete server modals wired to Servers Phase 2 endpoints.
- [ ] 209. Build /dashboard/pools — server pool management wired to GET /api/v1/pools.
- [ ] 210. Build /dashboard/vhosts — virtual host routing configuration table.
- [ ] 211. Build /dashboard/certs — TLS certificate management (upload PEM, view expiry, renewal status).

---

## 🖥️ Frontend — Dashboard: Reports

- [ ] 212. Build /dashboard/report-daily — daily security summary with charts and stats.
- [ ] 213. Build /dashboard/report-weekly — weekly trend comparison report.
- [ ] 214. Build /dashboard/report-monthly — monthly compliance-style report.
- [ ] 215. Build /dashboard/report-owasp — OWASP Top 10 coverage and violation summary.
- [ ] 216. Build /dashboard/report-compliance — PCI-DSS / GDPR compliance posture view.
- [ ] 217. Build /dashboard/report-custom — custom date-range report builder with chart exports.
- [ ] 218. Build /dashboard/export — export events/rules/reports as CSV or JSON download.

---

## 🖥️ Frontend — Dashboard: User & Admin Management

- [ ] 219. Build /dashboard/users — user management DataTable wired to GET /api/v1/users.
- [ ] 220. Add Create User modal (username, password, role) wired to POST /api/v1/users.
- [ ] 221. Add Edit User / Change Password modal wired to PATCH /api/v1/users/{id}.
- [ ] 222. Add Deactivate User confirmation dialog wired to DELETE /api/v1/users/{id}.
- [ ] 223. Build /dashboard/roles — role and permission matrix management view.

---

## 🖥️ Frontend — Dashboard: Settings Pages

- [ ] 224. Build /dashboard/settings — settings hub page with icon grid linking to sub-sections.
- [ ] 225. Build /dashboard/settings/network — interface, listen address, trusted proxy CIDR settings.
- [ ] 226. Build /dashboard/settings/proxy — timeout, buffer size, upstream retry, keep-alive settings.
- [ ] 227. Build /dashboard/settings/logging — log level, Elasticsearch endpoint, index prefix settings.
- [ ] 228. Build /dashboard/settings/notifications — webhook URL, alert thresholds, email recipient config.
- [ ] 229. Build /dashboard/settings/smtp — SMTP host, port, credentials, TLS toggle, test-send button.
- [ ] 230. Build /dashboard/settings/backup — trigger DB backup, list backups, download and restore controls.
- [ ] 231. Build /dashboard/settings/license — license key display, activation form, expiry status.

---

## 🖥️ Frontend — Dashboard: Help & System Pages

- [ ] 232. Build /dashboard/setup — first-run setup wizard (DB, admin password, upstream, test connection).
- [ ] 233. Build /dashboard/troubleshooting — common issues checklist and inline log viewer.
- [ ] 234. Build /dashboard/deployment — container status, image versions, uptime info cards.
- [ ] 235. Build /dashboard/docs — embedded documentation viewer (renders Markdown from /docs folder).
- [ ] 236. Build /dashboard/about — version info, open-source licenses, project changelog.

---

## 🧪 Testing & Quality Assurance

- [ ] 237. Write Pytest suite for POST /api/v1/auth/login (valid, invalid credentials, inactive user).
- [ ] 238. Write Pytest suite for GET /api/v1/auth/me (valid token, expired token, missing token).
- [ ] 239. Write Pytest suite for Rules CRUD (create, list, update, delete, 404 on missing).
- [ ] 240. Write Pytest suite for Rate Limits endpoints (create, list, update, delete).
- [ ] 241. Write Pytest suite for Analytics endpoints (overview, events pagination).
- [ ] 242. Develop Python test script: send 20 SQLi payloads through OpenResty, assert all return 403.
- [ ] 243. Develop Python test script: send XSS payloads, assert blocking.
- [ ] 244. Develop Python test script: burst 50 requests on rate-limited route, assert 429 after threshold.
- [ ] 245. Write Jest unit tests for RiskBadge, StatCard, DataTable components.
- [ ] 246. Write Playwright E2E test: login, view overview, create rule, verify in rules list, delete rule.

---

## 🐳 DevOps & Infrastructure

- [ ] 247. Implement GitHub Actions workflow: Python lint (Flake8 + Black) on every push.
- [ ] 248. Implement GitHub Actions workflow: Next.js npm run build verification on every push.
- [ ] 249. Implement GitHub Actions workflow: Pytest suite on every push.
- [ ] 250. Create docker-compose.prod.yml with resource limits, restart policies, named volumes.
- [ ] 251. Implement multi-stage Docker build for Next.js frontend (Node builder to slim runtime).
- [ ] 252. Write Nginx log rotation script (gzip and archive daily, retain 30 days).
- [ ] 253. Set up Prometheus /metrics endpoint in FastAPI via prometheus-fastapi-instrumentator.
- [ ] 254. Export OpenResty metrics (connections, blocks/sec, latency) via lua-resty-prometheus.
- [ ] 255. Create default Grafana dashboard JSON model for B5 (requests, blocks, latency panels).
- [ ] 256. Add security headers to Next.js responses (CSP, HSTS, X-Frame-Options) via next.config.js.
- [ ] 257. Write final end-to-end integration test: fire attack, proxy blocks, event in DB, visible on /dashboard/events.
