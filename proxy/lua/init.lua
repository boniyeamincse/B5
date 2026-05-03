-- init.lua
-- This script runs when Nginx starts

ngx.log(ngx.INFO, "B5 Web Application Firewall initializing...")

-- Global B5 settings
_G.B5_CONFIG = {
    mode = "blocking", -- "learning", "logging", "blocking"
    redis_host = "b5-redis",
    redis_port = 6379,
    sql_patterns = {
        "(?i)union.*select",
        "(?i)select.*from",
        "(?i)drop.*table",
        "(?i)insert.*into",
        "'.*or.*'.*="
    },
    xss_patterns = {
        "(?i)<script",
        "(?i)javascript:",
        "(?i)onerror=",
        "(?i)onload="
    }
}

ngx.log(ngx.INFO, "B5 WAF initialized successfully.")
