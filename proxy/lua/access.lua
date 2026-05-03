-- access.lua
-- This script runs for every incoming request

local b5_config = _G.B5_CONFIG
local cors_handler = require("cors_handler")

-- Handle CORS preflight before WAF inspection (exits 204 for valid OPTIONS).
cors_handler.handle_preflight()

local ip_access_control = require("ip_access_control")
local request_metadata = require("request_metadata")
local sql_injection_detector = require("sql_injection_detector")
local xss_detector = require("xss_detector")
local command_injection_detector = require("command_injection_detector")
local path_traversal_detector = require("path_traversal_detector")
local upload_inspector = require("upload_inspector")
local rate_limiter = require("rate_limiter")
local json_validator = require("json_validator")
local json_logger = require("json_logger")
local risk_scorer = require("risk_scorer")
local block_response = require("block_response")
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
    json_logger.log({
        event       = "block",
        attack_type = attack_type,
        detail      = detail,
        ip          = metadata.client_ip,
        method      = metadata.method,
        uri         = metadata.uri,
        host        = metadata.host,
        user_agent  = metadata.user_agent,
    })
    -- Increment risk score for this IP on every enforcement event
    local rs = b5_config.risk_score
    risk_scorer.record(metadata.client_ip, rs and rs.decay_seconds or 3600)
end

-- In learning/logging mode: log the would-be block but let the request through.
-- Returns true if the request should be blocked (blocking mode), false otherwise.
local learning = (b5_config.mode == "learning" or b5_config.mode == "logging")
local function maybe_block(status, attack_type, detail)
    log_event(attack_type, detail)
    if learning then
        ngx.log(ngx.WARN,
            "[B5 WAF Learning] Would block with ", tostring(status),
            " — passing through. Type: ", attack_type
        )
        return false
    end
    if status == ngx.HTTP_FORBIDDEN then
        block_response.send({
            attack_type = attack_type,
            detail      = detail,
            ip          = metadata.client_ip,
            uri         = metadata.uri,
            timestamp   = ngx.utctime(),
            request_id  = ngx.var.request_id,
        })
    else
        ngx.exit(status)
    end
    return true
end

local ip_action, ip_reason = ip_access_control.check(metadata.client_ip)

if ip_action == "block" then
    maybe_block(ngx.HTTP_FORBIDDEN, "IP Blocklist", "Matched Redis key block:" .. metadata.client_ip)
    if not learning then return end
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

-- High-risk IP check: auto-block IPs that have accumulated enough violations
local rs_cfg = b5_config.risk_score
if rs_cfg then
    local score = risk_scorer.get_score(metadata.client_ip)
    if score >= rs_cfg.threshold then
        maybe_block(
            ngx.HTTP_FORBIDDEN,
            "High Risk IP",
            "Risk score " .. tostring(score) .. " >= threshold " .. tostring(rs_cfg.threshold)
        )
        if not learning then return end
    end
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
        if not learning then return ngx.exit(429) end
    elseif rl_status ~= nil then
        ngx.log(ngx.ERR, "Rate limiter error for ", metadata.client_ip, ": ", tostring(rl_detail))
    end
end

-- Route-specific rate limiting
for _, route in ipairs(b5_config.route_rate_limits or {}) do
    if metadata.path:sub(1, #route.prefix) == route.prefix then
        local route_key = route.prefix .. ":" .. metadata.client_ip
        local rr_status, rr_detail = rate_limiter.check(
            route_key,
            route.requests,
            route.window_seconds
        )
        if rr_status == "limited" then
            ngx.log(
                ngx.WARN,
                "[B5 WAF RouteRateLimit] Route: ", route.prefix,
                ", IP: ", metadata.client_ip,
                ", count: ", tostring(rr_detail),
                ", limit: ", route.requests, "/", route.window_seconds, "s"
            )
            ngx.header["Retry-After"] = tostring(route.window_seconds)
            if not learning then return ngx.exit(429) end
        elseif rr_status ~= nil then
            ngx.log(ngx.ERR, "Route rate limiter error for ", route.prefix, ": ", tostring(rr_detail))
        end
        break  -- first matching prefix wins
    end
end

if metadata.uri ~= "" then
    local matched_sqli_pattern = sql_injection_detector.detect(
        metadata.normalized_uri,
        b5_config.sql_patterns
    )
    if matched_sqli_pattern then
        maybe_block(ngx.HTTP_FORBIDDEN, "SQL Injection", "Matched pattern: " .. matched_sqli_pattern)
        if not learning then return end
    end

    local matched_xss_pattern = xss_detector.detect(
        metadata.normalized_uri,
        b5_config.xss_patterns
    )
    if matched_xss_pattern then
        maybe_block(ngx.HTTP_FORBIDDEN, "Cross-Site Scripting (XSS)", "Matched pattern: " .. matched_xss_pattern)
        if not learning then return end
    end

    local matched_command_pattern = command_injection_detector.detect(
        metadata.normalized_uri,
        b5_config.command_patterns
    )
    if matched_command_pattern then
        maybe_block(ngx.HTTP_FORBIDDEN, "Command Injection", "Matched pattern: " .. matched_command_pattern)
        if not learning then return end
    end

    local matched_path_pattern = path_traversal_detector.detect(
        metadata.normalized_uri,
        b5_config.path_patterns
    )
    if matched_path_pattern then
        maybe_block(ngx.HTTP_FORBIDDEN, "Path Traversal", "Matched pattern: " .. matched_path_pattern)
        if not learning then return end
    end
end

-- Inspect POST body for malicious payloads
if metadata.body ~= "" then
    local decoded_body = ngx.unescape_uri(metadata.body)

    local matched_sqli = sql_injection_detector.detect(decoded_body, b5_config.sql_patterns)
    if matched_sqli then
        maybe_block(ngx.HTTP_FORBIDDEN, "SQL Injection (Body)", "Matched pattern: " .. matched_sqli)
        if not learning then return end
    end

    local matched_xss = xss_detector.detect(decoded_body, b5_config.xss_patterns)
    if matched_xss then
        maybe_block(ngx.HTTP_FORBIDDEN, "Cross-Site Scripting (Body)", "Matched pattern: " .. matched_xss)
        if not learning then return end
    end

    local matched_cmd = command_injection_detector.detect(decoded_body, b5_config.command_patterns)
    if matched_cmd then
        maybe_block(ngx.HTTP_FORBIDDEN, "Command Injection (Body)", "Matched pattern: " .. matched_cmd)
        if not learning then return end
    end

    local matched_path = path_traversal_detector.detect(decoded_body, b5_config.path_patterns)
    if matched_path then
        maybe_block(ngx.HTTP_FORBIDDEN, "Path Traversal (Body)", "Matched pattern: " .. matched_path)
        if not learning then return end
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
        maybe_block(ngx.HTTP_FORBIDDEN, "Forbidden File Upload", "Blocked file: " .. blocked_filename)
        if not learning then return end
    end
end

-- Validate JSON body for application/json requests
if content_type:find("application/json", 1, true) then
    local json_err = json_validator.validate(metadata.body)
    if json_err then
        ngx.log(
            ngx.WARN,
            "[B5 WAF InvalidJSON] IP: ", metadata.client_ip,
            ", URI: ", metadata.uri,
            ", Error: ", json_err
        )
        json_logger.log({
            event       = "invalid_json",
            attack_type = "Invalid JSON Body",
            detail      = json_err,
            ip          = metadata.client_ip,
            method      = metadata.method,
            uri         = metadata.uri,
            host        = metadata.host,
            user_agent  = metadata.user_agent,
        })
        if not learning then
            ngx.status = 400
            ngx.header["Content-Type"] = "application/json"
            ngx.say('{"error":"Bad Request","detail":"Invalid JSON body"}')
            return ngx.exit(400)
        end
    end
end

-- 2. If no rules match, the request passes through
