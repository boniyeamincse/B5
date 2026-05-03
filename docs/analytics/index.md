# B5 WAF Logging, Reporting & Analytics Guide

This section covers the data pipeline, logging mechanisms, and reporting features of B5 (Tasks 81-90).

## 81. JSON Structured Logging (Lua)
B5 generates high-fidelity, structured logs for every security event.
- **Format**: JSON.
- **Fields**:
  - `timestamp`: ISO 8601 format.
  - `client_ip`: The source IP address.
  - `request_id`: Unique ID for tracing the request.
  - `method`, `uri`, `host`: Request details.
  - `attack_type`: SQLi, XSS, etc.
  - `action`: `block`, `log`, or `allow`.
  - `rule_id`: ID of the triggered rule.
  - `risk_score`: Numeric impact of the event.

## 82. Log Ingestion (OpenSearch/Elasticsearch)
Logs are asynchronously shipped from the OpenResty data plane to the analytics store.
- **Pipeline**: Lua -> FluentBit/Logstash -> OpenSearch.
- **Process**: This ensures that high-volume logging does not impact the request processing latency of the proxy engine.

## 83. Index Lifecycle Management (ILM)
WAF logs can consume significant storage over time. B5 uses ILM policies to manage data:
- **Hot Phase**: Recent logs (last 7 days) are stored on fast storage for real-time dashboarding.
- **Warm/Cold Phase**: Older logs are moved to cheaper storage or compressed.
- **Deletion**: Logs are automatically purged after the retention period (e.g., 90 days) to comply with data privacy regulations.

## 84. Risk Score Calculation
Every request is assigned a dynamic "Risk Score" (0-100).
- **Factors**:
  - Rule severity (e.g., SQLi = +30, Rate Limit = +10).
  - IP Reputation (Known malicious = +20).
  - Frequency of violations from the same IP.
- **Threshold**: If an IP's cumulative score exceeds a threshold, B5 can automatically move them to a stricter "Blocking" state.

## 85. Manual Log Querying via API
The backend exposes endpoints to query raw logs for forensic analysis.
- **Endpoint**: `GET /api/v1/analytics/logs`
- **Parameters**: Support for time ranges, IP filtering, and attack type filtering.
- **Usage**: Useful for deep-diving into specific incidents or integrating with external SIEM tools.

## 86. Automated Security Reports
B5 generates periodic summaries of security activity.
- **Daily**: Summary of top blocked attacks and system health.
- **Weekly**: Trend analysis of attack volume and top target URLs.
- **Monthly**: Executive summary suitable for compliance audits and management reviews.

## 87. Datadog Integration
B5 logs can be easily forwarded to Datadog for centralized monitoring.
- **Setup**: Configure the B5 log pipeline to send JSON logs to the Datadog HTTP Intake API.
- **Benefit**: Provides advanced alerting, anomaly detection, and correlation with other infrastructure metrics.

## 88. Slack Notifications
Stay informed of security events in real-time.
- **Configuration**: Set a Slack Webhook URL in the Application Policy.
- **Alerting**: Configure thresholds (e.g., "Alert me if more than 50 blocks occur in 1 minute") to trigger notifications in a dedicated channel.

## 89. PagerDuty Integration (Critical Alerts)
For critical threats (e.g., persistent brute force or high-severity vulnerability exploits), B5 can trigger on-call alerts.
- **Integration**: Uses the PagerDuty Events API.
- **Logic**: Only "Critical" severity events or high-risk score incidents trigger a page to the security team.

## 90. IP Reputation & Database Integration
B5 maintains a database of known malicious IP addresses.
- **Data Sources**: Integrates with public threat intel feeds and B5's own global observations.
- **Lookup**: Every request IP is checked against the reputation cache in Redis for sub-millisecond decision making.
- **Scoring**: High-risk IPs are either blocked instantly or subjected to much tighter rate limits.
