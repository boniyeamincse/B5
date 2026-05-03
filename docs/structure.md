# B5 Project Structure

This document outlines the directory and file structure for the B5 Web Application Firewall repository. To maintain simplicity and ease of deployment, we will use a monorepo structure containing both the control plane (backend), the data plane (proxy), and the dashboard (frontend).

```text
B5/
│
├── docs/                        # Project documentation
│   ├── blueprint.md             # System architecture and overview
│   └── structure.md             # This file
│
├── proxy/                       # Data Plane: OpenResty (Nginx + Lua)
│   ├── conf/
│   │   ├── nginx.conf           # Main Nginx configuration
│   │   └── b5.conf              # B5 specific vhost and proxy rules
│   ├── lua/
│   │   ├── init.lua             # Initialization script
│   │   ├── access.lua           # Main request inspection logic
│   │   ├── rules.lua            # Rule engine logic (SQLi, XSS, etc.)
│   │   ├── rate_limit.lua       # Redis-based rate limiting logic
│   │   └── utils.lua            # Helper functions
│   └── Dockerfile               # Dockerfile for the OpenResty proxy
│
├── backend/                     # Control Plane: Python FastAPI
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── api/                 # API route handlers (v1, v2)
│   │   ├── core/                # Core configuration, security, config
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic schemas for request/response
│   │   ├── crud/                # Create, Read, Update, Delete database logic
│   │   └── services/            # Business logic (rule syncing, etc.)
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Dockerfile for the FastAPI backend
│
├── frontend/                    # Admin Dashboard: Next.js + React
│   ├── src/
│   │   ├── app/                 # Next.js App Router (pages, layouts)
│   │   ├── components/          # Reusable React components (UI, charts, tables)
│   │   ├── lib/                 # Utility functions, API clients
│   │   └── styles/              # Global styles, Tailwind configuration
│   ├── public/                  # Static assets (images, icons)
│   ├── package.json             # Node.js dependencies
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   └── Dockerfile               # Dockerfile for the Next.js frontend
│
├── database/                    # Database configuration (PostgreSQL)
│   └── init.sql                 # Initial schema setup script
│
├── docker-compose.yml           # Local development and MVP deployment configuration
└── README.md                    # Project introduction and quick start guide
```

## Key Components

1.  **`proxy/` (OpenResty):** Handles all incoming traffic. The Lua scripts in `proxy/lua/` are responsible for connecting to Redis to fetch rate limits and rule sets, executing the core WAF engine logic, and forwarding clean traffic to the target backend.
2.  **`backend/` (FastAPI):** Exposes a REST API for the dashboard. It manages the state of the WAF (rules, policies, configuration) in PostgreSQL and publishes updates to the proxy engine.
3.  **`frontend/` (Next.js):** The modern, user-friendly interface for administrators to view real-time metrics, manage security rules, and inspect blocked requests.
4.  **`docker-compose.yml`:** The glue that ties the entire stack together, defining containers for OpenResty, FastAPI, Next.js, PostgreSQL, Redis, and OpenSearch.
