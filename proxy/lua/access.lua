-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local req_uri = ngx.var.request_uri
local req_method = ngx.var.request_method
local req_headers = ngx.req.get_headers()

-- Helper function to log security events
local function log_event(attack_type, detail)
    ngx.log(ngx.WARN, "[B5 WAF Block] Type: ", attack_type, ", IP: ", ngx.var.remote_addr, ", URI: ", req_uri, ", Detail: ", detail)
end

-- 1. Check URI for SQLi and XSS
if req_uri then
    local unescaped_uri = ngx.unescape_uri(req_uri)
    
    -- Check SQLi
    for _, pattern in ipairs(b5_config.sql_patterns) do
        if ngx.re.match(unescaped_uri, pattern, "ijo") then
            log_event("SQL Injection", "Matched pattern: " .. pattern)
            return ngx.exit(ngx.HTTP_FORBIDDEN)
        end
    end
    
    -- Check XSS
    for _, pattern in ipairs(b5_config.xss_patterns) do
        if ngx.re.match(unescaped_uri, pattern, "ijo") then
            log_event("Cross-Site Scripting (XSS)", "Matched pattern: " .. pattern)
            return ngx.exit(ngx.HTTP_FORBIDDEN)
        end
    end
end

-- 2. If no rules match, the request passes through
