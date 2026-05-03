-- block_response.lua
-- Template engine for the 403 Access Denied page.
-- Reads proxy/html/403.html once into the shared dict cache, then performs
-- fast string substitution of {{variable}} placeholders for each request.

local _M = {}

local TEMPLATE_PATH  = "/usr/local/openresty/nginx/html/403.html"
local CACHE_KEY      = "b5:403_template"
local CACHE_DICT     = "b5_cache"

-- Read the template HTML, caching it in the shared-memory dict.
local function get_template()
    local cache = ngx.shared[CACHE_DICT]
    if cache then
        local cached = cache:get(CACHE_KEY)
        if cached then return cached end
    end

    local f, err = io.open(TEMPLATE_PATH, "r")
    if not f then
        ngx.log(ngx.ERR, "[B5 block_response] cannot open template: ", err)
        return nil
    end
    local content = f:read("*a")
    f:close()

    if cache then
        cache:set(CACHE_KEY, content)
    end
    return content
end

-- Escape a string so it is safe to embed in HTML (prevents XSS in the
-- 403 page itself — the attack_type / detail fields come from internal
-- pattern strings, but the URI and IP come from the request).
local function html_escape(s)
    if not s then return "" end
    return tostring(s)
        :gsub("&",  "&amp;")
        :gsub("<",  "&lt;")
        :gsub(">",  "&gt;")
        :gsub('"',  "&quot;")
        :gsub("'",  "&#39;")
end

-- Send the rendered 403 page.  `vars` is a table of placeholder → value.
-- Placeholders in the template are written as {{key}}.
function _M.send(vars)
    local tpl = get_template()
    if not tpl then
        -- Fallback: plain-text 403 if template is unavailable
        ngx.status = ngx.HTTP_FORBIDDEN
        ngx.header["Content-Type"] = "text/plain; charset=utf-8"
        ngx.say("403 Access Denied — B5 WAF")
        ngx.exit(ngx.HTTP_FORBIDDEN)
        return
    end

    -- Build substitution table with HTML-escaped values
    local safe = {}
    for k, v in pairs(vars) do
        safe[k] = html_escape(v)
    end

    -- Default placeholders
    safe.attack_type = safe.attack_type or "Unknown"
    safe.detail      = safe.detail      or ""
    safe.ip          = safe.ip          or ngx.var.remote_addr or ""
    safe.uri         = safe.uri         or ngx.var.request_uri or ""
    safe.timestamp   = safe.timestamp   or ngx.utctime()
    safe.request_id  = safe.request_id  or ngx.var.request_id  or ngx.md5(tostring(ngx.now()))

    local body = tpl:gsub("{{([%w_]+)}}", safe)

    ngx.status = ngx.HTTP_FORBIDDEN
    ngx.header["Content-Type"]  = "text/html; charset=utf-8"
    ngx.header["Cache-Control"] = "no-store"
    ngx.header["X-B5-Block"]    = safe.attack_type
    ngx.say(body)
    ngx.exit(ngx.HTTP_FORBIDDEN)
end

return _M
