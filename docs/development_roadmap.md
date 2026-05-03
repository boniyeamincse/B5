# B5 WAF - 100 Development Tasks Roadmap

This document outlines a comprehensive list of 100 development (code writing) tasks required to build the complete B5 Web Application Firewall platform, covering the OpenResty proxy, FastAPI backend, and Next.js frontend.

## 🛡️ Data Plane: Proxy & Core Engine (Lua / OpenResty)
- [x] 1. Enhance `init.lua` to load WAF configuration from environment variables.
- [x] 2. Implement Redis connection pooling in `init.lua` for high performance.
- [x] 3. Write Lua module for extracting request metadata (IP, headers, URI, method).
- [ ] 4. Implement IP Allowlist/Blocklist checking logic against Redis.
- [ ] 5. Write SQL Injection (SQLi) detection logic using regex patterns.
- [ ] 6. Write Cross-Site Scripting (XSS) detection logic.
- [ ] 7. Implement Command Injection detection logic.
- [ ] 8. Implement Path Traversal (Directory Climbing) detection logic.
- [ ] 9. Write Lua logic to inspect HTTP POST bodies for malicious payloads.
- [ ] 10. Implement file upload inspection (multipart/form-data) for forbidden extensions.
- [ ] 11. Develop the Rate Limiting core using the Redis sliding window algorithm.
- [ ] 12. Implement route-specific rate limiting logic.
- [ ] 13. Write JSON validation logic for `application/json` API requests.
- [ ] 14. Create the 'Learning Mode' script to safely log traffic without blocking.
- [ ] 15. Write a custom Lua logger to format blocked events as JSON.
- [ ] 16. Implement asynchronous log shipping from Lua to Elasticsearch/OpenSearch.
- [ ] 17. Add a feature to generate dynamic "Risk Scores" per IP based on violations.
- [ ] 18. Create the custom HTML template engine for the 403 Access Denied page.
- [ ] 19. Write Lua script to handle custom CORS headers dynamically.
- [ ] 20. Implement automated proxy health checks and failover routing.

## 🗄️ Database Schema & Migrations (PostgreSQL)
- [ ] 21. Set up SQLAlchemy ORM and Alembic migration environment.
- [ ] 22. Create the `User` model for Admin Dashboard login.
- [ ] 23. Create the `Rule` model (SQLi, XSS, IP Block, etc.).
- [ ] 24. Create the `Policy` model (groups of rules assigned to domains/routes).
- [ ] 25. Create the `RateLimitConfig` model for database-backed rate shaping.
- [ ] 26. Create the `EndpointConfig` model for API strict-mode whitelisting.
- [ ] 27. Create the `AuditLog` model to track admin dashboard changes.
- [ ] 28. Write initial Alembic migration for base schema.
- [ ] 29. Write seeder script to populate default OWASP Top 10 rules.
- [ ] 30. Implement database indexing for fast rule lookups.

## ⚙️ Control Plane: Backend Core (Python / FastAPI)
- [ ] 31. Initialize FastAPI application with custom metadata (Title, Version).
- [ ] 32. Configure CORS middleware for the Next.js frontend domain.
- [ ] 33. Set up database dependency injection (`get_db`).
- [ ] 34. Implement password hashing using passlib and bcrypt.
- [ ] 35. Implement JWT generation and token validation for Admin Auth.
- [ ] 36. Write Pydantic schema for `UserCreate` and `UserResponse`.
- [ ] 37. Write Pydantic schema for `RuleCreate` and `RuleUpdate`.
- [ ] 38. Implement background task queue (Celery/Redis) for async operations.
- [ ] 39. Write the "Rule Sync" service to push PostgreSQL rules to Redis for the proxy.
- [ ] 40. Develop the "IP Reputation" service that pulls threat intel feeds.
- [ ] 41. Write a service to aggregate daily security statistics from Elasticsearch.
- [ ] 42. Implement a unified error handling and exception formatting middleware.
- [ ] 43. Write logging configuration (structlog) for backend traceablity.
- [ ] 44. Set up environment variable validation using Pydantic BaseSettings.
- [ ] 45. Create a health check endpoint `/health` for Docker Compose.

## 🔌 Backend API Routes (FastAPI)
- [ ] 46. Build `POST /api/v1/auth/login` (Admin Login).
- [ ] 47. Build `GET /api/v1/auth/me` (Get current user profile).
- [ ] 48. Build `GET /api/v1/rules` (List all rules with pagination).
- [ ] 49. Build `POST /api/v1/rules` (Create a new custom rule).
- [ ] 50. Build `PUT /api/v1/rules/{id}` (Update existing rule).
- [ ] 51. Build `DELETE /api/v1/rules/{id}` (Soft delete rule).
- [ ] 52. Build `GET /api/v1/analytics/overview` (Dashboard stats: blocked, allowed).
- [ ] 53. Build `GET /api/v1/analytics/events` (Fetch recent security events/logs).
- [ ] 54. Build `POST /api/v1/policies/sync` (Manually trigger sync to Proxy).
- [ ] 55. Build `GET /api/v1/ratelimits` (List active rate limits).

## 🎨 Frontend Setup & UI Components (Next.js / Tailwind)
- [ ] 56. Initialize Next.js 14 project with App Router and TypeScript.
- [ ] 57. Configure Tailwind CSS with the premium B5 brand colors (Electric Cyan, Midnight Blue).
- [ ] 58. Install and configure Shadcn UI components.
- [ ] 59. Build the base `Layout` component (Sidebar, Navbar).
- [ ] 60. Create the custom `Button` component with micro-animations.
- [ ] 61. Create the `DataTable` component for listing rules and logs.
- [ ] 62. Build the `Modal` component for creating/editing items.
- [ ] 63. Create the `StatCard` component for the dashboard overview.
- [ ] 64. Integrate a charting library (Recharts or Chart.js).
- [ ] 65. Build the `LineChart` component for traffic over time.
- [ ] 66. Build the `BarChart` component for top attacking IPs.
- [ ] 67. Create the `Badge` component for risk scores (High, Med, Low).
- [ ] 68. Implement custom Toast notifications for API success/error states.
- [ ] 69. Set up Zustand or React Context for global state management (Auth, Theme).
- [ ] 70. Implement Dark/Light mode toggle switch.

## 🖥️ Frontend Pages & Integration
- [ ] 71. Build the `/login` page with glassmorphic design and form validation.
- [ ] 72. Implement NextAuth or custom JWT storage (cookies/localStorage) for session persistence.
- [ ] 73. Build the `/dashboard` (Home) page assembling StatCards and Charts.
- [ ] 74. Connect the `/dashboard` page to the FastAPI analytics endpoints.
- [ ] 75. Build the `/rules` page with the DataTable component.
- [ ] 76. Implement the "Add Rule" modal and connect to `POST /api/v1/rules`.
- [ ] 77. Implement the "Edit Rule" workflow.
- [ ] 78. Build the `/events` (Live Logs) page with real-time or polling updates.
- [ ] 79. Add filtering and search capabilities to the `/events` page.
- [ ] 80. Build the `/rate-limits` page for configuring traffic shaping.
- [ ] 81. Build the `/settings` page for global WAF configurations (Mode switching).
- [ ] 82. Create a "Sync to Proxy" button in the navbar to deploy rule changes.
- [ ] 83. Handle 401 Unauthorized responses to redirect users to `/login`.
- [ ] 84. Add loading skeletons for data fetching states.
- [ ] 85. Ensure full mobile responsiveness across all dashboard pages.

## 🧪 Testing & DevOps
- [ ] 86. Write Pytest suite for FastAPI Authentication endpoints.
- [ ] 87. Write Pytest suite for FastAPI Rule CRUD endpoints.
- [ ] 88. Develop a test script (Python/Bash) to send SQLi payloads to OpenResty and verify blocking.
- [ ] 89. Develop a test script to verify rate limiting thresholds.
- [ ] 90. Write Jest unit tests for core React UI components.
- [ ] 91. Implement a GitHub Actions workflow for Python linting (Flake8/Black).
- [ ] 92. Implement a GitHub Actions workflow for Next.js build verification.
- [ ] 93. Create a unified `docker-compose.prod.yml` for production deployments.
- [ ] 94. Implement multi-stage Docker build for the Next.js frontend to reduce image size.
- [ ] 95. Write a script to automatically rotate and compress Nginx access logs.
- [ ] 96. Set up a Prometheus endpoint `/metrics` in FastAPI.
- [ ] 97. Export OpenResty metrics (connections, blocks) for Prometheus.
- [ ] 98. Create a default Grafana dashboard JSON model for B5 metrics.
- [ ] 99. Add security headers (CSP, HSTS) to the Next.js application responses.
- [ ] 100. Write the final end-to-end (E2E) integration test tying the Proxy, Backend, and Frontend together.
