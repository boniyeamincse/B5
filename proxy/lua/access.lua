-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local ip_access_control = require("ip_access_control")
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

local ip_action, ip_reason = ip_access_control.check(metadata.client_ip)

if ip_action == "block" then
    log_event("IP Blocklist", "Matched Redis key block:" .. metadata.client_ip)
    return ngx.exit(ngx.HTTP_FORBIDDEN)
end

if ip_action == "allow" then
    ngx.log(
        ngx.INFO,
        "[B5 WAF Allowlist] IP: ",
        metadata.client_ip,
        ", Method: ",
        metadata.method,
        ", URI: ",
        metadata.uri
    )
    return
end

if ip_reason then
    ngx.log(ngx.ERR, "IP access control lookup failed for ", metadata.client_ip, ": ", ip_reason)
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
