-- init.lua
-- This script runs when Nginx starts

ngx.log(ngx.INFO, "B5 Web Application Firewall initializing...")

-- Load environment variables with fallback defaults
local redis_host = os.getenv("B5_REDIS_HOST") or "b5-redis"
local redis_port = tonumber(os.getenv("B5_REDIS_PORT")) or 6379
local b5_mode = os.getenv("B5_MODE") or "blocking"

-- Global B5 settings
_G.B5_CONFIG = {
    mode = b5_mode, -- "learning", "logging", "blocking"
    redis_host = redis_host,
    redis_port = redis_port,
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

-- Initialize Redis connection pool helper function globally
local redis = require "resty.redis"

_G.get_redis_connection = function()
    local red = redis:new()
    red:set_timeouts(1000, 1000, 1000) -- 1 sec
    
    local ok, err = red:connect(_G.B5_CONFIG.redis_host, _G.B5_CONFIG.redis_port)
    if not ok then
        ngx.log(ngx.ERR, "Failed to connect to Redis: ", err)
        return nil
    end
    
    return red
end

_G.keepalive_redis = function(red)
    if not red then return end
    -- Put connection into the pool: 10 seconds max idle time, max 100 connections
    local ok, err = red:set_keepalive(10000, 100)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set Redis keepalive: ", err)
    end
end

ngx.log(ngx.INFO, "B5 WAF initialized successfully.")
