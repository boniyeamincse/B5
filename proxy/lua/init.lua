-- init.lua
-- This script runs when Nginx starts

ngx.log(ngx.INFO, "B5 Web Application Firewall initializing...")

-- Load environment variables with fallback defaults
local redis_host = os.getenv("B5_REDIS_HOST") or "b5-redis"
local redis_port = tonumber(os.getenv("B5_REDIS_PORT")) or 6379
local b5_mode = os.getenv("B5_MODE") or "blocking"
local redis_connect_timeout = tonumber(os.getenv("B5_REDIS_CONNECT_TIMEOUT_MS")) or 1000
local redis_send_timeout = tonumber(os.getenv("B5_REDIS_SEND_TIMEOUT_MS")) or 1000
local redis_read_timeout = tonumber(os.getenv("B5_REDIS_READ_TIMEOUT_MS")) or 1000
local redis_pool_max_idle_time = tonumber(os.getenv("B5_REDIS_POOL_MAX_IDLE_TIME_MS")) or 10000
local redis_pool_size = tonumber(os.getenv("B5_REDIS_POOL_SIZE")) or 100
local redis_pool_backlog = tonumber(os.getenv("B5_REDIS_POOL_BACKLOG")) or 50
local redis_pool_name = os.getenv("B5_REDIS_POOL_NAME") or "b5-redis-pool"
local es_host = os.getenv("B5_ES_HOST") or "http://b5-elasticsearch:9200"
local risk_threshold  = tonumber(os.getenv("B5_RISK_THRESHOLD"))  or 10
local risk_decay_secs = tonumber(os.getenv("B5_RISK_DECAY_SECS")) or 3600

-- CORS: comma-separated list of allowed origins, e.g. "https://app.example.com,http://localhost:3000"
-- Set to "*" to allow any origin (not recommended in production).
local cors_origins_env = os.getenv("B5_CORS_ORIGINS") or "http://localhost:3000"
local cors_origins_set = {}
for origin in cors_origins_env:gmatch("[^,]+") do
    cors_origins_set[origin:match("^%s*(.-)%s*$")] = true  -- trim whitespace
end

-- Global B5 settings
_G.B5_CONFIG = {
    mode = b5_mode, -- "learning", "logging", "blocking"
    elasticsearch_host = es_host,
    risk_score = {
        threshold    = risk_threshold,   -- auto-block when violations >= this
        decay_seconds = risk_decay_secs, -- TTL (seconds) before score resets
    },
    cors = {
        origins           = cors_origins_set, -- set keyed by allowed origin string
        methods           = os.getenv("B5_CORS_METHODS")      or "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        headers           = os.getenv("B5_CORS_HEADERS")      or "Authorization,Content-Type,X-Requested-With",
        max_age           = os.getenv("B5_CORS_MAX_AGE")       or "86400",
        allow_credentials = (os.getenv("B5_CORS_CREDENTIALS") or "true") == "true",
    },
    redis_host = redis_host,
    redis_port = redis_port,
    redis_connect_timeout = redis_connect_timeout,
    redis_send_timeout = redis_send_timeout,
    redis_read_timeout = redis_read_timeout,
    redis_pool_max_idle_time = redis_pool_max_idle_time,
    redis_pool_size = redis_pool_size,
    redis_pool_backlog = redis_pool_backlog,
    redis_pool_name = redis_pool_name,
    rate_limit = {
        enabled         = (os.getenv("B5_RATE_LIMIT_ENABLED") or "true") == "true",
        requests        = tonumber(os.getenv("B5_RATE_LIMIT_REQUESTS"))  or 100,
        window_seconds  = tonumber(os.getenv("B5_RATE_LIMIT_WINDOW"))   or 60,
    },
    -- Route-specific overrides — checked in order, first prefix match wins.
    -- Each entry: { prefix = "/path", requests = N, window_seconds = W }
    route_rate_limits = {
        { prefix = "/login",       requests = 5,  window_seconds = 60  },
        { prefix = "/api/auth",    requests = 10, window_seconds = 60  },
        { prefix = "/api/",        requests = 50, window_seconds = 60  },
    },
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
    },
    command_patterns = {
        [[(?i)(?:;|\|\||&&|`|\\$\()\s*(?:cat|ls|pwd|whoami|ping|nc|bash|sh|wget|curl)]],
        [[(?i)(?:^|[;&|`])\s*(?:cat|ls|pwd|whoami|ping|nc|bash|sh|wget|curl)\b]],
        [[(?i)(?:/bin/|/usr/bin/)(?:sh|bash|wget|curl|nc)\b]]
    },
    path_patterns = {
        [[(?i)(?:\.\./|\.\.\\)]],
        [[(?i)(?:%2e%2e%2f|%2e%2e/|\.\.%2f)]],
        [[(?i)/(?:etc/(?:passwd|shadow|hosts|group|issue)|proc/self/environ)]],
        [[(?i)(?:c:\boot\.ini|c:\windows\win\.ini)]]
    },
    forbidden_upload_extensions = {
        "php", "php3", "php4", "php5", "phtml",
        "sh", "bash", "exe", "bat", "cmd",
        "jsp", "asp", "aspx", "cgi", "pl", "py"
    }
}

-- Initialize Redis connection pool helper function globally
local redis = require "resty.redis"

_G.get_redis_connection = function()
    local red = redis:new()
    red:set_timeouts(
        _G.B5_CONFIG.redis_connect_timeout,
        _G.B5_CONFIG.redis_send_timeout,
        _G.B5_CONFIG.redis_read_timeout
    )

    local ok, err = red:connect(_G.B5_CONFIG.redis_host, _G.B5_CONFIG.redis_port, {
        pool = _G.B5_CONFIG.redis_pool_name,
        pool_size = _G.B5_CONFIG.redis_pool_size,
        backlog = _G.B5_CONFIG.redis_pool_backlog,
    })
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil
    end

    return red
end

_G.keepalive_redis = function(red)
    if not red then return end
    local ok, err = red:set_keepalive(
        _G.B5_CONFIG.redis_pool_max_idle_time,
        _G.B5_CONFIG.redis_pool_size
    )
    if not ok then
        ngx.log(ngx.ERR, "Failed to set Redis keepalive: ", err)
    end
end

ngx.log(
    ngx.INFO,
    "B5 WAF initialized successfully. Redis pool=",
    _G.B5_CONFIG.redis_pool_name,
    ", size=",
    _G.B5_CONFIG.redis_pool_size,
    ", backlog=",
    _G.B5_CONFIG.redis_pool_backlog
)
