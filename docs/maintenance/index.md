# B5 WAF Maintenance & Advanced Operations Guide

This section covers maintenance tasks, scaling, performance tuning, and contribution guidelines (Tasks 91-100).

## 91. Zero-Downtime Rule Updates
B5 is designed to update its security posture without interrupting traffic.
- **Process**:
  1. Backend updates the rules in PostgreSQL and pushes the new set to Redis.
  2. OpenResty workers fetch the updated rules from Redis during the `access` phase.
  3. No Nginx reload or restart is required, ensuring zero downtime for active connections.

## 92. Upgrading OpenResty Base Image
To keep the data plane secure, you should periodically update the OpenResty Docker image.
1. Update the version tag in `docker-compose.yml`.
2. Run `docker compose pull b5-proxy`.
3. Run `docker compose up -d b5-proxy`.
- **Note**: Docker Compose will handle the container replacement with minimal interruption.

## 93. Horizontal Scaling
For high-traffic applications, B5 can be scaled horizontally.
- **Approach**: Run multiple instances of the `b5-proxy` container behind a Layer 4 Load Balancer (e.g., AWS NLB, HAProxy, or F5).
- **Shared State**: All proxy instances connect to the same Redis and PostgreSQL instances to ensure consistent rule enforcement and rate limiting.

## 94. PostgreSQL Backup & Restore
Protect your configuration data with regular backups.
- **Backup**: `docker exec b5-postgres pg_dump -U b5admin b5 > b5_backup.sql`
- **Restore**: `cat b5_backup.sql | docker exec -i b5-postgres psql -U b5admin b5`

## 95. Flushing Redis Cache Safely
If you need to reset rate limits or IP reputations:
- **Command**: `docker exec b5-redis redis-cli FLUSHDB`
- **Caution**: This will immediately reset all active counters, potentially allowing a burst of traffic that was previously throttled.

## 96. Handling False Positives
If a legitimate request is blocked:
1. **Identify**: Find the blocked request in the "Threat Events" dashboard.
2. **Analyze**: Identify which rule ID was triggered.
3. **Tune**: Adjust the regex pattern to be less broad, or add the specific IP/URI to the `ip_allow` list.
4. **Log-Only Mode**: Temporarily move the specific rule to "Log Only" mode to verify the fix before re-enabling blocking.

## 97. Tuning Nginx Worker Processes
Optimize B5 for your server hardware:
- **worker_processes**: Set to `auto` or the number of CPU cores.
- **worker_connections**: Increase to `4096` or higher for high-concurrency environments.
- **Keepalive**: Tune `keepalive_timeout` and `keepalive_requests` to balance latency and resource usage.

## 98. Adding Custom Lua Modules
Advanced users can extend B5's functionality with custom Lua code.
1. Place your `.lua` file in `proxy/lua/`.
2. Load it in `init.lua` or `access.lua` using `local my_mod = require "my_module"`.
3. Ensure any third-party dependencies are included in the Docker image.

## 99. Performance Benchmarking
Measure the latency and throughput of your B5 deployment.
- **Tool**: We recommend using `wrk` or `ab` (Apache Benchmark).
- **Command**: `wrk -t12 -c400 -d30s http://localhost:8080/`
- **Metrics**: Compare latency with and without the WAF enabled to measure the inspection overhead.

## 100. Contribution Guidelines
We welcome contributions to B5!
- **Code Style**: Follow PEP8 for Python and Lua Style Guide for Lua.
- **Pull Requests**: Ensure all tests pass (`pytest`) and documentation is updated.
- **Code of Conduct**: Be respectful and collaborative. We aim to build a supportive community for web security.
