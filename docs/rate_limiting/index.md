# B5 WAF Rate Limiting & Traffic Shaping Guide

This section covers the theory and configuration of B5's rate limiting and traffic shaping capabilities (Tasks 41-50).

## 41. Redis-Based Sliding Window Rate Limiting
B5 uses a **Sliding Window Log** or **Sliding Window Counter** algorithm implemented in Redis via Lua scripts. Unlike a Fixed Window, the Sliding Window prevents traffic bursts at the edge of window boundaries.
- **How it works**: For each request, B5 stores a timestamped entry in a Redis sorted set (ZSET) or increments a counter in a precise sub-window.
- **Benefit**: Provides a much smoother and fairer limiting experience for users while strictly protecting the backend.

## 42. Global IP Rate Limits
Global limits apply to all incoming traffic regardless of the destination URL.
- **Default Policy**: 100 requests per minute per IP.
- **Configuration**: This is set in the `B5_CONFIG` in `init.lua` or overridden via the Admin Dashboard.
- **Redis Key**: `ratelimit:global:[IP]`

## 43. Route-Specific Rate Limits
Sensitive endpoints like `/login`, `/api/payment`, or `/register` often require stricter limits than the rest of the application.
- **Configuration**: In the Application Policy section, you can define limits for specific URI patterns.
- **Example**:
  - `/login`: 5 requests per minute.
  - `/api/search`: 30 requests per minute.
- **Redis Key**: `ratelimit:route:[URI]:[IP]`

## 44. HTTP 429 Too Many Requests
When a user exceeds their allocated quota, B5 intercepts the request before it reaches the backend and returns an **HTTP 429** status code.
- **Response Body**: A clean JSON or HTML message stating "Too Many Requests".
- **Headers**: Includes a `Retry-After` header indicating how many seconds the user should wait before trying again.

## 45. Burst Traffic Allowances
B5 supports a "Token Bucket" style burst allowance. This allows users to occasionally exceed their sustained rate for a short period.
- **Burst Size**: Defined as the maximum number of tokens a bucket can hold.
- **Use Case**: Allows for page loads that naturally trigger multiple concurrent asset requests (JS, CSS, Images).

## 46. Whitelisting Internal IP Subnets
Internal services, scrapers, or trusted partner IPs can be exempted from rate limiting.
- **Setup**: Add the IP or CIDR range to the `ip_allow` list.
- **Effect**: B5 skips the rate limiting check entirely for these IPs to ensure internal service availability.

## 47. Redis Key Expiration
To save memory, all rate limiting keys in Redis have an **Auto-Expiration (TTL)**.
- **Logic**: The TTL is typically set to the duration of the rate limit window (e.g., 60 seconds).
- **Cleanup**: Redis automatically removes old keys, ensuring the WAF stays lightweight even under heavy traffic.

## 48. Tracking Events in the Dashboard
Every time a rate limit is triggered, B5 increments a metric counter.
- **Dashboard View**: The "Traffic Shaping" tab shows real-time graphs of "Limited Requests" vs "Allowed Requests".
- **Logs**: Blocked 429 events are logged with the matching route and IP for audit purposes.

## 49. Bot Detection & Frequency Analysis
B5 monitors the frequency and consistency of requests to identify automated bots.
- **Heuristics**: Checks for sub-second request intervals and inhumanly consistent timing.
- **Action**: High-frequency IPs are flagged and can be automatically moved to a "Challenge" or "Block" state.

## 50. Dynamic Rate Limits & Risk Scores
B5 can dynamically adjust a user's rate limit based on their **Risk Score**.
- **Logic**: If an IP has recently triggered SQLi or XSS rules (even if they were just logged), B5 can automatically lower their rate limit as a precautionary measure.
- **Benefit**: Proactively throttles potential attackers before they find a vulnerability.
