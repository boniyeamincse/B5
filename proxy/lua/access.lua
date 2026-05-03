-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local ip_access_control = require("ip_access_control")
local request_metadata = require("request_metadata")
local sql_injection_detector = require("sql_injection_detector")
local xss_detector = require("xss_detector")
local command_injection_detector = require("command_injection_detector")
local path_traversal_detector = require("path_traversal_detector")
local upload_inspector = require("upload_inspector")
local rate_limiter = require("rate_limiter")
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

-- Rate limiting (sliding window via Redis)
if b5_config.rate_limit.enabled then
    local rl_status, rl_detail = rate_limiter.check(
        metadata.client_ip,
        b5_config.rate_limit.requests,
        b5_config.rate_limit.window_seconds
    )
    if rl_status == "limited" then
        ngx.log(
            ngx.WARN,
            "[B5 WAF RateLimit] IP: ", metadata.client_ip,
            ", count: ", tostring(rl_detail),
            ", limit: ", b5_config.rate_limit.requests,
            "/", b5_config.rate_limit.window_seconds, "s"
        )
        ngx.header["Retry-After"] = tostring(b5_config.rate_limit.window_seconds)
        return ngx.exit(429)
    elseif rl_status ~= nil then
        ngx.log(ngx.ERR, "Rate limiter error for ", metadata.client_ip, ": ", tostring(rl_detail))
    end
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

    local matched_path_pattern = path_traversal_detector.detect(
        metadata.normalized_uri,
        b5_config.path_patterns
    )
    if matched_path_pattern then
        log_event("Path Traversal", "Matched pattern: " .. matched_path_pattern)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- Inspect POST body for malicious payloads
if metadata.body ~= "" then
    local decoded_body = ngx.unescape_uri(metadata.body)

    local matched_sqli = sql_injection_detector.detect(decoded_body, b5_config.sql_patterns)
    if matched_sqli then
        log_event("SQL Injection (Body)", "Matched pattern: " .. matched_sqli)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    local matched_xss = xss_detector.detect(decoded_body, b5_config.xss_patterns)
    if matched_xss then
        log_event("Cross-Site Scripting (Body)", "Matched pattern: " .. matched_xss)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    local matched_cmd = command_injection_detector.detect(decoded_body, b5_config.command_patterns)
    if matched_cmd then
        log_event("Command Injection (Body)", "Matched pattern: " .. matched_cmd)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end

    local matched_path = path_traversal_detector.detect(decoded_body, b5_config.path_patterns)
    if matched_path then
        log_event("Path Traversal (Body)", "Matched pattern: " .. matched_path)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- Inspect multipart file uploads for forbidden extensions
local content_type = metadata.headers["content-type"] or ""
if content_type:find("multipart/form-data", 1, true) then
    local blocked_filename = upload_inspector.inspect(
        metadata.body,
        content_type,
        b5_config.forbidden_upload_extensions
    )
    if blocked_filename then
        log_event("Forbidden File Upload", "Blocked file: " .. blocked_filename)
        return ngx.exit(ngx.HTTP_FORBIDDEN)
    end
end

-- 2. If no rules match, the request passes through
