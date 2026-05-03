-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local request_metadata = require("request_metadata")
local metadata = request_metadata.extract()

local function log_event(attack_type, detail)
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
end

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
