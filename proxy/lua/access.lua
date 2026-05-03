-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
-- Task 3: Extract Request Metadata
local metadata = {
    ip = ngx.var.remote_addr,
    method = ngx.var.request_method,
    uri = ngx.var.request_uri,
    host = ngx.var.host,
    user_agent = ngx.var.http_user_agent or "Unknown",
    headers = ngx.req.get_headers()
}

-- Helper function to log security events
local function log_event(attack_type, detail)
    ngx.log(ngx.WARN, "[B5 WAF Block] Type: ", attack_type, ", IP: ", metadata.ip, ", URI: ", metadata.uri, ", Detail: ", detail)
end

-- 1. Check URI for SQLi and XSS
if metadata.uri then
    local unescaped_uri = ngx.unescape_uri(metadata.uri)
    
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
