# B5 - Modern Web Application Firewall Blueprint

## 1. Project Vision
B5 is a modern, smart, fast, and easy-to-manage Web Application Firewall (WAF). It sits between end-users and the web application, inspecting incoming traffic to detect malicious requests and block threats before they reach the server. The primary goal is to provide strong web protection with a clean dashboard, simple policy control, real-time monitoring, and intelligent threat detection.

## 2. Core Features (MVP)
*   **Traffic Proxy Engine:** Forwards HTTP/HTTPS traffic to backend applications.
*   **Threat Detection Engine:** Blocks OWASP Top 10 attacks (SQLi, XSS, Command Injection, etc.).
*   **Rule Engine:** Custom rules to Allow, Block, Log, or Rate Limit traffic.
*   **Rate Limiting Engine:** IP-based and route-based traffic shaping to prevent DoS.
*   **Logging System:** Captures detailed security events.
*   **Admin Dashboard:** Modern React-based UI to manage policies and view logs.

## 3. Technology Stack Selection
To ensure high performance, low latency, and modern development practices, we have selected the following stack:

*   **Proxy Engine (Data Plane):** **OpenResty (Nginx + Lua)**
    *   *Why:* Nginx is the industry standard for reverse proxies. OpenResty integrates Lua scripting, allowing us to inspect and modify requests/responses at line-rate speeds with minimal overhead.
*   **Backend / Control Plane API:** **Python (FastAPI)**
    *   *Why:* High-performance async Python framework. Excellent for rapid API development, rule management, and future integration with Machine Learning for the "Learning Mode".
*   **Frontend Dashboard:** **Next.js (React) + Tailwind CSS**
    *   *Why:* Next.js provides a robust structure for React apps. Tailwind CSS ensures a premium, modern, and highly responsive user interface without heavy CSS overhead.
*   **Primary Database:** **PostgreSQL**
    *   *Why:* Relational structure is perfect for storing users, complex rule sets, and system configurations.
*   **Cache & Fast Storage:** **Redis**
    *   *Why:* In-memory storage is essential for distributed rate limiting, session management, and caching IP reputations for fast lookups by the proxy engine.
*   **Log Management:** **Elasticsearch / OpenSearch**
    *   *Why:* Highly scalable text search engine, perfect for storing and visualizing millions of access logs and security events in real-time.
*   **Deployment:** **Docker & Docker Compose**
    *   *Why:* Containerization ensures that B5 is easy to deploy across different environments, adhering to the goal of being simple and affordable to install.

## 4. MVP Architecture Flow

1.  **Incoming Request:** Client sends a request to the protected application.
2.  **B5 Proxy (OpenResty):** Intercepts the request.
3.  **Security Checks (Lua scripts):**
    *   Checks IP reputation and rate limits (via Redis).
    *   Matches request URL, headers, and body against security rules.
4.  **Action:**
    *   *Block:* Returns a 403/406 Error page to the client. Logs the event.
    *   *Allow:* Forwards the request to the upstream application backend.
5.  **Logging:** Security events are asynchronously shipped to OpenSearch.
6.  **Dashboard:** The React frontend queries the FastAPI backend to fetch logs and update rules in PostgreSQL.
