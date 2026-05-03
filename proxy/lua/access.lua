-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
-- Task 3: Extract Request Metadata
local metadata = {
local request_metadata = require("request_metadata")
local metadata = request_metadata.extract()
-- Helper function to log security events
local function log_event(attack_type, detail)
    ngx.log(ngx.WARN, "[B5 WAF Block] Type: ", attack_type, ", IP: ", metadata.ip, ", URI: ", metadata.uri, ", Detail: ", detail)
    ngx.log(
        ngx.WARN,
        "[B5 WAF Block] Type: ",
        attack_type,
        ", IP: ",
        metadata.client_ip,
        ", Method: ",
        metadata.method,
        ", URI: ",
        metadata.uri,
        ", Detail: ",
        detail
    )

-- 1. Check URI for SQLi and XSS
if metadata.uri then
if metadata.uri ~= "" then
    -- Check SQLi
    for _, pattern in ipairs(b5_config.sql_patterns) do
        if ngx.re.match(metadata.normalized_uri, pattern, "ijo") then
            log_event("SQL Injection", "Matched pattern: " .. pattern)
            return ngx.exit(ngx.HTTP_FORBIDDEN)
        end
    end
    
    -- Check XSS
    for _, pattern in ipairs(b5_config.xss_patterns) do
        if ngx.re.match(metadata.normalized_uri, pattern, "ijo") then
            log_event("Cross-Site Scripting (XSS)", "Matched pattern: " .. pattern)
            return ngx.exit(ngx.HTTP_FORBIDDEN)
        end
    end
end

-- 2. If no rules match, the request passes through
