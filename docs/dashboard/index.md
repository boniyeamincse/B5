# B5 WAF Frontend Dashboard Guide

This section covers the setup and functionality of the B5 Admin Dashboard (Tasks 61-70).

## 61. Next.js Application Setup
The B5 dashboard is built using **Next.js 14** with the App Router and TypeScript.
- **Directory**: `frontend/`
- **Installation**: Run `npm install` within the directory.
- **Development**: Run `npm run dev` to start the local dev server.
- **Build**: Use `npm run build` for production-ready assets.

## 62. Authentication System
The dashboard uses a secure JWT-based authentication system.
- **Login**: Users authenticate via the `/login` page against the FastAPI backend.
- **Session Management**: JWT tokens are stored in secure, HTTP-only cookies or local storage (configurable).
- **Protected Routes**: Middleware checks for a valid session before allowing access to internal dashboard pages.

## 63. Security Overview Metrics & Charts
The home page provides a high-level summary of system health:
- **Total Requests**: Count of all traffic processed.
- **Blocked Attacks**: Real-time counter of intercepted threats.
- **Top Attacking IPs**: Bar chart showing the most active malicious sources.
- **Attack Types distribution**: Pie chart showing the ratio of SQLi vs. XSS vs. Rate Limiting events.

### Dashboard Menu Bar
The sidebar navigation provides quick access to:
- **Overview**: The main metrics dashboard.
- **Threat Events**: Live feed of security logs.
- **Rule Management**: CRUD interface for WAF rules.
- **App Policy**: Route-specific configurations.
- **Settings**: System-wide preferences and mode switching.

## 64. Threat Events Live Feed
The "Threat Events" page displays a real-time list of security violations.
- **Data Source**: Fetched from the backend API, which queries the OpenSearch/Elasticsearch log store.
- **Updates**: Uses SWR or React Query with a short polling interval (or WebSockets) to keep the feed fresh.
- **Details**: Clicking an event shows the full request metadata (headers, body snippet) and the specific rule triggered.

## 65. Rule Management UI Workflow
Users can manage the WAF's security logic through a clean table interface.
- **Add Rule**: A modal allows users to specify name, type (SQLi, XSS, etc.), and the regex pattern.
- **Toggle**: Enable/disable rules with a single click.
- **Validation**: The UI validates regex patterns before submission to prevent syntax errors in the proxy.

## 66. Application Policy Walkthrough
This page allows fine-grained control over specific application routes.
- **Route Definitions**: Define paths like `/api/*` or `/admin`.
- **Policy Assignment**: Choose which rule sets apply to which routes.
- **Strict Mode**: Toggle endpoint whitelisting on/off for the selected route.

## 67. Exporting Security Reports
B5 allows administrators to generate reports for compliance and analysis.
- **CSV Export**: Download raw event data for a selected time range.
- **PDF Export**: Generate a visual summary report with charts and executive summaries.

## 68. Next.js API Routes & FastAPI Interaction
The frontend interacts with the backend using standardized API calls.
- **Client-Side**: Uses `fetch` or `axios` with base URL pointing to the FastAPI service.
- **Server-Side**: Next.js Server Components or API routes act as a proxy to the backend to handle sensitive operations or SSR.

## 69. Tailwind CSS & Theme Customization
B5 uses a premium, modern design aesthetic powered by **Tailwind CSS**.
- **Configuration**: `tailwind.config.js` defines the primary "Electric Cyan" and "Midnight Blue" color tokens.
- **Shadcn UI**: Used for high-quality, accessible components like buttons, tables, and dialogs.
- **Theming**: Supports Dark Mode by default using the `dark` class.

## 70. Internationalization (i18n)
The dashboard is designed for global teams.
- **Setup**: Uses `next-intl` or similar for translation management.
- **Structure**: Translation strings are stored in JSON files under `messages/`.
- **Switching**: Users can toggle between languages (English, etc.) in the Settings panel.
