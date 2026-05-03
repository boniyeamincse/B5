#!/usr/bin/env python3
"""
seed_owasp.py — OWASP Top 10 (2021) baseline rule seeder for B5 WAF.

Creates:
  - One Policy:  "OWASP Top 10 Baseline"
  - Ten Rules:   one detection rule per OWASP A01-A10 category

Idempotent: re-running never creates duplicate policies or rules.

Usage (from repo root, with DB reachable):
    # Inside the b5-backend container:
    docker exec -it b5-backend python -m scripts.seed_owasp

    # Or directly, with DB exposed on 5433:
    DATABASE_URL="postgresql://b5admin:b5password@localhost:5433/b5" \
        python backend/scripts/seed_owasp.py
"""

import os
import sys
import logging

# Allow running both as a module (-m scripts.seed_owasp) and as a plain script.
# When run as a plain script, add the backend/ dir to sys.path so imports work.
if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.models import Policy, Rule

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("seed_owasp")

# ---------------------------------------------------------------------------
# DB connection — honour DATABASE_URL env var, fall back to container default.
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://b5admin:b5password@b5-postgres:5432/b5",
)

# ---------------------------------------------------------------------------
# OWASP Top 10 (2021) rule definitions
# Each entry: (name, owasp_type, description_as_pattern_comment, pattern, action)
# Patterns are PCRE-compatible regexes suitable for server-side log matching
# and for driving Nginx/Lua ngx.re.find() calls in the proxy layer.
# ---------------------------------------------------------------------------
OWASP_RULES = [
    # A01:2021 – Broken Access Control
    (
        "OWASP A01 — Path Traversal / Broken Access Control",
        "path_traversal",
        # Directory traversal attempts: ../  ..\  url-encoded variants
        r"(?:\.\.[\\/]){2,}|%2e%2e[\\/]|%252e%252e|\.\.%2f|\.\.%5c",
        "block",
    ),
    # A02:2021 – Cryptographic Failures (sensitive data in URL / query)
    (
        "OWASP A02 — Sensitive Data Exposure in URL",
        "sensitive_data",
        # Passwords, tokens, secrets passed as query params or path segments
        r"(?i)(?:password|passwd|secret|api[_-]?key|token|access[_-]?token"
        r"|auth[_-]?token|private[_-]?key)=[^&\s]{3,}",
        "log",
    ),
    # A03:2021 – Injection (SQL)
    (
        "OWASP A03 — SQL Injection",
        "sqli",
        # Classic SQLi: UNION SELECT, OR 1=1, comment sequences, stacked queries
        r"(?i)(?:'\s*(?:or|and)\s*'?\d|union\s+(?:all\s+)?select|"
        r"(?:--|#|/\*)\s*$|;\s*(?:drop|alter|truncate|insert|update|delete)"
        r"|\bexec(?:ute)?\s*\(|xp_cmdshell|information_schema|sys\.tables)",
        "block",
    ),
    # A03:2021 – Injection (Command)
    (
        "OWASP A03 — Command Injection",
        "cmdi",
        # Shell metacharacters used to chain OS commands
        r"(?i)(?:[;&|`$]\s*(?:cat|ls|id|whoami|uname|pwd|wget|curl|bash|sh|nc"
        r"|python|perl|php|ruby)\b|\$\(|\$\{IFS\}|%0[aA](?:cat|id|ls))",
        "block",
    ),
    # A03:2021 – Injection (XSS / HTML)
    (
        "OWASP A03 — Cross-Site Scripting (XSS)",
        "xss",
        # Script tags, event handlers, javascript: URIs, common XSS vectors
        r"(?i)(?:<\s*script[^>]*>|javascript\s*:|vbscript\s*:|"
        r"on(?:load|error|click|mouse(?:over|out)|focus|blur|key(?:up|down|press)"
        r"|submit|change|input|ready)\s*=|"
        r"<\s*(?:iframe|object|embed|applet|base|link|meta|style|svg|math)[^>]*>|"
        r"expression\s*\(|eval\s*\(|document\s*\.\s*(?:cookie|location|write)"
        r"|\balert\s*\(|prompt\s*\(|confirm\s*\()",
        "block",
    ),
    # A04:2021 – Insecure Design (SSRF probes)
    (
        "OWASP A04 — SSRF / Internal Network Probe",
        "ssrf",
        # URL params pointing at RFC-1918 / loopback / cloud metadata endpoints
        r"(?i)(?:url|uri|src|href|redirect|return|next|target|dest(?:ination)?)="
        r"(?:https?://)?(?:127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|"
        r"localhost|0\.0\.0\.0|169\.254\.169\.254|metadata\.google\.internal"
        r"|fd[0-9a-f]{2}:)",
        "block",
    ),
    # A05:2021 – Security Misconfiguration (exposed debug/admin endpoints)
    (
        "OWASP A05 — Exposed Admin / Debug Endpoint",
        "misconfig",
        # Common paths that should never be publicly reachable
        r"(?i)^/(?:admin|manager|phpmyadmin|adminer|wp-admin|wp-login\.php"
        r"|\.env|\.git(?:/|$)|\.svn(?:/|$)|actuator(?:/|$)|console(?:/|$)"
        r"|debug(?:/|$)|phpinfo\.php|server-status|server-info"
        r"|_profiler|_debugbar)",
        "block",
    ),
    # A06:2021 – Vulnerable and Outdated Components (scanner fingerprinting)
    (
        "OWASP A06 — Vulnerability Scanner / Fingerprinting UA",
        "scanner",
        # Well-known scanners, fuzzers, and exploit frameworks in User-Agent
        r"(?i)(?:nikto|sqlmap|nessus|openvas|masscan|zgrab|dirbuster|gobuster"
        r"|wfuzz|hydra|medusa|metasploit|nuclei|acunetix|netsparker|appscan"
        r"|burpsuite|havij|pangolin|skipfish|arachni|w3af|vega\b)",
        "block",
    ),
    # A07:2021 – Identification and Authentication Failures (brute-force signals)
    (
        "OWASP A07 — Auth Bypass / Credential Stuffing Pattern",
        "auth_bypass",
        # SQLi-style auth bypass in login fields; base64-encoded admin:* credentials
        r"(?i)(?:'\s*(?:or|and)\s+['\"0-9]|admin'--|"
        r"(?:username|user|login|email)\s*=\s*['\"]?admin['\"]?"
        r"\s*(?:--|#|/\*)|Authorization:\s*Basic\s+YWRtaW46)",
        "block",
    ),
    # A08:2021 – Software and Data Integrity Failures (unsafe deserialization)
    (
        "OWASP A08 — Insecure Deserialization",
        "deserialization",
        # Java serialization magic bytes (base64), PHP unserialize(), Python pickle
        r"(?:rO0AB|H4sI|ACED0005|aced0005"             # Java serialized object (raw + b64)
        r"|O:\d+:\"[A-Za-z_][A-Za-z0-9_]*\":\d+:\{"    # PHP serialize()
        r"|(?:pickle|marshal|yaml\.load|eval\(base64)",  # Python / generic
        "block",
    ),
    # A09:2021 – Security Logging and Monitoring Failures (log injection)
    (
        "OWASP A09 — Log Injection / CRLF Injection",
        "log_injection",
        # Carriage-return / line-feed injected into headers or params to poison logs
        r"(?:%0[dD]%0[aA]|%0[aA]%0[dD]|\r\n|\r|\n)"
        r"(?:Content-Type|Set-Cookie|Location|HTTP/|<html|javascript:)",
        "block",
    ),
    # A10:2021 – Server-Side Request Forgery (extended)
    (
        "OWASP A10 — SSRF via File / Protocol Handler",
        "ssrf_proto",
        # file://, gopher://, dict://, ftp:// used in SSRF attacks
        r"(?i)(?:file://|gopher://|dict://|ftp://|ldap://|tftp://|sftp://)"
        r"(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|\[::1\])",
        "block",
    ),
]

POLICY_NAME = "OWASP Top 10 Baseline"


def seed(db) -> None:
    # ---- Policy -------------------------------------------------------
    policy = db.query(Policy).filter(Policy.name == POLICY_NAME).first()
    if policy is None:
        policy = Policy(
            name=POLICY_NAME,
            description=(
                "Auto-seeded baseline policy covering OWASP Top 10 (2021) "
                "categories A01–A10. Rules are tuned for broad detection with "
                "minimal false positives. Review and tighten patterns for production."
            ),
            is_default=False,
        )
        db.add(policy)
        db.flush()   # get policy.id before inserting rules
        log.info("Created policy: %s (id=%d)", POLICY_NAME, policy.id)
    else:
        log.info("Policy already exists: %s (id=%d) — skipping", POLICY_NAME, policy.id)

    # ---- Rules --------------------------------------------------------
    created = 0
    skipped = 0
    for name, rule_type, pattern, action in OWASP_RULES:
        existing = db.query(Rule).filter(Rule.name == name).first()
        if existing:
            log.info("  SKIP  %-60s (already exists, id=%d)", name[:60], existing.id)
            skipped += 1
            continue

        rule = Rule(
            name=name,
            type=rule_type,
            pattern=pattern,
            action=action,
            enabled=True,
        )
        db.add(rule)
        log.info("  ADD   %s", name)
        created += 1

    db.commit()
    log.info(
        "\nSeeding complete — %d rule(s) created, %d skipped (already existed).",
        created,
        skipped,
    )


def main() -> None:
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        seed(db)
    except Exception:
        db.rollback()
        log.exception("Seeding failed — transaction rolled back.")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
