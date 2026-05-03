-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local ip_access_control = require("ip_access_control")
local request_metadata = require("request_metadata")
local sql_injection_detector = require("sql_injection_detector")
local xss_detector = require("xss_detector")
local command_injection_detector = require("command_injection_detector")
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
    local matched_sqli_pattern = sql_injection_detector.detect(
        metadata.normalized_uri,
        b5_config.sql_patterns
    )
    if matched_sqli_pattern then
        log_event("SQL Injection", "Matched pattern: " .. matched_sqli_pattern)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    local matched_xss_pattern = xss_detector.detect(
        metadata.normalized_uri,
        b5_config.xss_patterns
    )
    if matched_xss_pattern then
        log_event("Cross-Site Scripting (XSS)", "Matched pattern: " .. matched_xss_pattern)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    local matched_command_pattern = command_injection_detector.detect(
        metadata.normalized_uri,
        b5_config.command_patterns
    )
    if matched_command_pattern then
        log_event("Command Injection", "Matched pattern: " .. matched_command_pattern)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- 2. If no rules match, the request passes through
