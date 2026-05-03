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

-- Global B5 settings
_G.B5_CONFIG = {
    mode = b5_mode, -- "learning", "logging", "blocking"
    redis_host = redis_host,
    redis_port = redis_port,
    redis_connect_timeout = redis_connect_timeout,
    redis_send_timeout = redis_send_timeout,
    redis_read_timeout = redis_read_timeout,
    redis_pool_max_idle_time = redis_pool_max_idle_time,
    redis_pool_size = redis_pool_size,
    redis_pool_backlog = redis_pool_backlog,
    redis_pool_name = redis_pool_name,
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
