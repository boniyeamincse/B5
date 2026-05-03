-- cors_handler.lua
-- Dynamic CORS policy enforcement for the B5 WAF.
--
-- Usage in the access phase:
--   cors_handler.handle_preflight()   -- call at top of access.lua;
--                                     -- exits 204 for valid OPTIONS requests
-- Usage in the header-filter phase (header_filter_by_lua_block in nginx.conf):
--   require("cors_handler").set_headers()

local _M = {}

-- Return the CORS config from B5_CONFIG, or safe defaults.
local function cfg()
    return (_G.B5_CONFIG and _G.B5_CONFIG.cors) or {
        origins           = {},
        methods           = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        headers           = "Authorization,Content-Type,X-Requested-With",
        max_age           = "86400",
        allow_credentials = false,
    }
end

-- Resolve the correct Access-Control-Allow-Origin value for this request.
-- Returns the matched origin string, "*", or nil (no CORS headers should be set).
local function resolve_origin(c)
    local request_origin = ngx.var.http_origin
    if not request_origin or request_origin == "" then
        return nil
    end

    -- Wildcard shortcut
    if c.origins["*"] then
        -- With wildcard we cannot echo credentials
        return "*"
    end

    if c.origins[request_origin] then
        return request_origin
    end

    return nil
end

-- Set CORS response headers.  Called from both the access phase (preflight)
-- and the header-filter phase (actual requests).
function _M.set_headers()
    local c = cfg()
    local allowed_origin = resolve_origin(c)
    if not allowed_origin then return end

    ngx.header["Access-Control-Allow-Origin"] = allowed_origin
    ngx.header["Access-Control-Allow-Methods"] = c.methods
    ngx.header["Access-Control-Allow-Headers"] = c.headers
    ngx.header["Access-Control-Max-Age"]       = c.max_age
    ngx.header["Vary"] = "Origin"

    if c.allow_credentials and allowed_origin ~= "*" then
        ngx.header["Access-Control-Allow-Credentials"] = "true"
    end
end

-- Handle CORS preflight (OPTIONS) requests.
-- If the request is an OPTIONS with an Origin header, respond 204 immediately
-- and skip the WAF inspection pipeline.  Call this at the very top of access.lua.
function _M.handle_preflight()
    if ngx.req.get_method() ~= "OPTIONS" then
        return false
    end

    local request_origin = ngx.var.http_origin
    if not request_origin or request_origin == "" then
        return false
    end

    local c = cfg()
    local allowed_origin = resolve_origin(c)

    if not allowed_origin then
        -- Origin not in whitelist — block the preflight
        ngx.status = ngx.HTTP_FORBIDDEN
        ngx.header["Content-Type"] = "text/plain"
        ngx.say("CORS: origin not allowed")
        ngx.exit(ngx.HTTP_FORBIDDEN)
        return true
    end

    -- Valid preflight: set headers and return 204 No Content
    ngx.header["Access-Control-Allow-Origin"]  = allowed_origin
    ngx.header["Access-Control-Allow-Methods"] = c.methods
    ngx.header["Access-Control-Allow-Headers"] = c.headers
    ngx.header["Access-Control-Max-Age"]       = c.max_age
    ngx.header["Vary"] = "Origin"

    if c.allow_credentials and allowed_origin ~= "*" then
        ngx.header["Access-Control-Allow-Credentials"] = "true"
    end

    ngx.status = 204
    ngx.header["Content-Length"] = "0"
    ngx.exit(204)
    return true
end

return _M
