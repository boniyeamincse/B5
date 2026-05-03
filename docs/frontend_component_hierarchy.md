# B5 WAF — Next.js React Frontend Component Hierarchy

**Version:** 1.0  
**Last Updated:** 2026-05-03  
**Related:** [architecture_overview.md](architecture_overview.md)

---

## 1. Why Next.js?

The B5 admin dashboard is built with **Next.js** (React) and **Tailwind CSS**. Next.js was chosen for:

| Reason | Benefit |
|--------|---------|
| **App Router** | File-system routing with nested layouts — clean URL structure without extra config |
| **Server Components** | Initial page data can be fetched server-side, reducing client bundle size |
| **Built-in API routes** | Thin BFF (Backend-for-Frontend) layer for proxying calls to FastAPI (avoids CORS issues in dev) |
| **React ecosystem** | Access to Recharts, React Query, React Hook Form, and other mature libraries |
| **Tailwind CSS** | Utility-first CSS — fast to build responsive, consistent UI without writing custom stylesheets |

---

## 2. Pages and Routes

All routes are defined under `frontend/src/app/`. Next.js App Router maps the directory structure to URL paths.

```
/                          → Redirect to /dashboard
/login                     → Authentication page
/dashboard                 → Security Overview (main home)
/dashboard/events          → Threat Events live feed
/dashboard/events/[id]     → Single event detail
/dashboard/applications    → Registered applications list
/dashboard/applications/new → Add new application
/dashboard/applications/[id] → Application settings
/dashboard/policies        → Policy list
/dashboard/policies/[id]   → Policy editor (rules + mode)
/dashboard/rules           → All rules across policies
/dashboard/rules/new       → Rule creation form
/dashboard/rules/[id]      → Rule editor
/dashboard/ip-blocklist    → IP blocklist manager
/dashboard/reports         → Analytics and reports
/dashboard/settings        → System settings
/dashboard/users           → Admin user management
/dashboard/users/new       → Add admin user
```

---

## 3. Layout Structure

Next.js App Router uses **nested layouts**. B5 has two layout levels:

```
RootLayout (app/layout.tsx)
│  HTML shell, global CSS, font loading, theme provider
│
├── AuthLayout (app/(auth)/layout.tsx)
│   │  Centered card layout for unauthenticated pages
│   └── /login
│
└── DashboardLayout (app/(dashboard)/layout.tsx)
    │  Sidebar + TopNav + main content area
    │  Requires authenticated session (redirects to /login if no token)
    ├── /dashboard
    ├── /dashboard/events
    ├── /dashboard/applications
    ├── /dashboard/policies
    └── ... (all protected pages)
```

---

## 4. Full Component Tree

```
App
├── Providers (app/providers.tsx)
│   ├── QueryClientProvider    ← React Query (async data fetching + caching)
│   ├── AuthProvider           ← JWT token context, current user
│   └── ThemeProvider          ← Light/dark mode
│
├── AuthLayout
│   └── LoginPage
│       ├── LoginForm
│       │   ├── InputField (username)
│       │   ├── InputField (password)
│       │   └── SubmitButton
│       └── AlertBanner (error messages)
│
└── DashboardLayout
    ├── Sidebar
    │   ├── B5Logo
    │   ├── NavItem (Dashboard)
    │   ├── NavItem (Events)
    │   ├── NavItem (Applications)
    │   ├── NavItem (Policies)
    │   ├── NavItem (Rules)
    │   ├── NavItem (IP Blocklist)
    │   ├── NavItem (Reports)
    │   └── NavItem (Settings)
    │
    ├── TopNav
    │   ├── PageTitle
    │   ├── NotificationBell
    │   └── UserMenu (logout, profile)
    │
    └── MainContent
        ├── DashboardPage (/dashboard)
        │   ├── StatsRow
        │   │   ├── StatCard (Requests Today)
        │   │   ├── StatCard (Threats Blocked)
        │   │   ├── StatCard (Active Rules)
        │   │   └── StatCard (Avg Risk Score)
        │   ├── TrafficChart        ← requests/blocks over time (Recharts)
        │   ├── AttackTypeChart     ← pie chart: SQLi vs XSS vs RateLimit
        │   ├── TopAttackersTable   ← top 10 source IPs
        │   └── RecentEventsWidget  ← last 10 security events
        │
        ├── EventsPage (/dashboard/events)
        │   ├── EventFilters
        │   │   ├── DateRangePicker
        │   │   ├── AttackTypeSelect
        │   │   ├── SeveritySelect
        │   │   └── IPSearchInput
        │   ├── EventsTable
        │   │   └── EventRow (repeats)
        │   │       ├── Timestamp
        │   │       ├── ClientIP
        │   │       ├── AttackTypeBadge
        │   │       ├── SeverityBadge
        │   │       └── ActionBadge
        │   └── Pagination
        │
        ├── EventDetailPage (/dashboard/events/[id])
        │   ├── EventHeader (timestamp, severity, action)
        │   ├── RequestDetailsCard
        │   ├── RuleMatchCard
        │   └── RawEventJSON
        │
        ├── ApplicationsPage (/dashboard/applications)
        │   ├── ApplicationCard (repeats)
        │   │   ├── AppName + Domain
        │   │   ├── PolicyBadge
        │   │   ├── ModeBadge (blocking/logging/learning)
        │   │   └── Actions (Edit, Delete)
        │   └── AddApplicationButton
        │
        ├── PolicyEditorPage (/dashboard/policies/[id])
        │   ├── PolicyHeader
        │   │   ├── PolicyName
        │   │   ├── ModeSelector      ← blocking / logging / learning
        │   │   └── SaveButton
        │   ├── RulesTable
        │   │   └── RuleRow (repeats)
        │   │       ├── RuleName
        │   │       ├── Target (uri/body/header)
        │   │       ├── Pattern (truncated)
        │   │       ├── SeverityBadge
        │   │       ├── EnableToggle
        │   │       └── EditButton
        │   └── AddRuleButton
        │
        ├── RuleEditorPage (/dashboard/rules/[id])
        │   ├── RuleForm
        │   │   ├── InputField (name)
        │   │   ├── TextareaField (description)
        │   │   ├── PatternInput     ← regex input with live test
        │   │   ├── TargetSelect     ← uri, query, body, header, cookie
        │   │   ├── ActionSelect     ← block, log, allow
        │   │   ├── SeveritySelect   ← info, low, medium, high, critical
        │   │   └── EnabledToggle
        │   └── PatternTester        ← live test input against the regex
        │
        ├── IPBlocklistPage (/dashboard/ip-blocklist)
        │   ├── BlocklistTable
        │   │   └── BlocklistRow (ip, reason, expires, remove button)
        │   └── AddIPForm
        │
        └── ReportsPage (/dashboard/reports)
            ├── ReportRangePicker
            ├── TopAttackTypesChart
            ├── ThreatTrendChart
            ├── TopAttackingIPsTable
            └── ExportButton (CSV / PDF)
```

---

## 5. Authentication Flow

```
User visits /dashboard
  └─► DashboardLayout checks AuthContext for valid JWT
        ├─► No token → redirect to /login
        └─► Token present → check expiry
              ├─► Expired → attempt silent refresh via /api/v1/auth/refresh
              │     ├─► Refresh success → update token in context + localStorage
              │     └─► Refresh failed → redirect to /login
              └─► Valid → render page
```

The JWT is stored in `localStorage` (or an HTTP-only cookie for higher security in production). The `AuthProvider` injects the token into every API client request via an axios interceptor or `fetch` wrapper.

---

## 6. API Client Layer

All API calls go through a centralised client in `frontend/src/lib/api-client.ts`. This file:

- Adds the `Authorization: Bearer {token}` header to every request.
- Handles 401 responses by triggering a token refresh or logout.
- Provides typed functions for each API endpoint.

```typescript
// lib/api-client.ts (simplified example)

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getToken()
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options?.headers,
        },
    })
    if (!res.ok) throw new ApiError(res.status, await res.json())
    return res.json() as Promise<T>
}

export const api = {
    events:       { list: (params) => apiFetch(`/api/v1/events?${params}`) },
    policies:     { list: () => apiFetch("/api/v1/policies") },
    rules:        { create: (body) => apiFetch("/api/v1/rules", { method: "POST", body: JSON.stringify(body) }) },
    applications: { list: () => apiFetch("/api/v1/applications") },
    ipBlocklist:  { block: (body) => apiFetch("/api/v1/ip-blocklist", { method: "POST", body: JSON.stringify(body) }) },
}
```

---

## 7. State Management

B5 keeps state management simple for the MVP:

| Concern | Solution |
|---------|---------|
| **Server data** (events, rules, policies) | **React Query** (`@tanstack/react-query`) — handles caching, background refresh, loading/error states |
| **Auth state** (current user, JWT token) | **React Context** (`AuthContext`) |
| **Form state** | **React Hook Form** — lightweight, performant |
| **Global UI state** (sidebar open/closed, modals) | Local `useState` in the relevant layout/component |

React Query is preferred over Redux or Zustand for server data because it eliminates boilerplate and provides automatic cache invalidation (e.g., after creating a rule, the rules list query is automatically refetched).

---

## 8. Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // B5 brand colours
                "b5-primary":  "#1E3A5F",  // Dark navy — sidebar, primary buttons
                "b5-accent":   "#2563EB",  // Blue — active states, links
                "b5-danger":   "#DC2626",  // Red — blocked/critical events
                "b5-warning":  "#D97706",  // Amber — medium severity
                "b5-success":  "#16A34A",  // Green — allowed requests
                "b5-surface":  "#F8FAFC",  // Off-white — page background
            },
        },
    },
    plugins: [],
}
```

---

## 9. Responsiveness

All dashboard pages are responsive across mobile, tablet, and desktop:

| Breakpoint | Layout |
|------------|--------|
| Mobile (`< 768px`) | Sidebar collapses to a hamburger menu; tables switch to card view |
| Tablet (`768px–1024px`) | Sidebar shown as icon-only; cards shown in 2 columns |
| Desktop (`> 1024px`) | Full sidebar with labels; cards in 3–4 columns |

---

## 10. Related Documentation

| Document | Description |
|---------|-------------|
| [architecture_overview.md](architecture_overview.md) | Full system architecture |
| [fastapi_control_plane.md](fastapi_control_plane.md) | Control plane REST API reference |
| [waf_modes.md](waf_modes.md) | Mode behaviour (affects dashboard mode selector) |
