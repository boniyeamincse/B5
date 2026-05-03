local _M = {}
local cjson = require "cjson.safe"

local LOG_PATH = "/usr/local/openresty/nginx/logs/waf_events.log"
local ES_INDEX = "waf-events"

-- Timer callback: runs off the hot path in a lightweight Nginx timer coroutine.
-- Uses ngx.socket.tcp (built-in cosocket) — no external dependencies required.
local function ship_to_es(premature, json_line)
    if premature then return end

    local cfg     = _G.B5_CONFIG
    local es_url  = (cfg and cfg.elasticsearch_host) or "http://b5-elasticsearch:9200"

    -- Parse scheme://host:port
    local host, port_str = es_url:match("^https?://([^:/]+):?(%d*)")
    if not host then
        ngx.log(ngx.ERR, "[B5 json_logger] invalid ES URL: ", es_url)
        return
    end
    local port = tonumber(port_str) or 9200
    local path = "/" .. ES_INDEX .. "/_doc"

    local sock = ngx.socket.tcp()
    sock:settimeout(3000)

    local ok, err = sock:connect(host, port)
    if not ok then
        ngx.log(ngx.ERR, "[B5 json_logger] ES connect error: ", err)
        return
    end

    local request = table.concat({
        "POST ", path, " HTTP/1.1\r\n",
        "Host: ", host, ":", tostring(port), "\r\n",
        "Content-Type: application/json\r\n",
        "Content-Length: ", tostring(#json_line), "\r\n",
        "Connection: close\r\n",
        "\r\n",
        json_line,
    })

    local _, send_err = sock:send(request)
    if send_err then
        ngx.log(ngx.ERR, "[B5 json_logger] ES send error: ", send_err)
    end

    -- Drain the status line; ignore response body
    sock:receive("*l")
    sock:close()
end

function _M.log(event)
    event.timestamp = ngx.utctime()
    event.mode      = _G.B5_CONFIG and _G.B5_CONFIG.mode or "unknown"

    local line, err = cjson.encode(event)
    if not line then
        ngx.log(ngx.ERR, "[B5 json_logger] cjson encode error: ", err)
        return
    end

    -- Write to local file (fast synchronous I/O)
    local f, ferr = io.open(LOG_PATH, "a")
    if not f then
        ngx.log(ngx.ERR, "[B5 json_logger] failed to open log file: ", ferr)
    else
        f:write(line .. "\n")
        f:close()
    end

    -- Ship to Elasticsearch asynchronously (zero-delay timer — non-blocking)
    local ok, timer_err = ngx.timer.at(0, ship_to_es, line)
    if not ok then
        ngx.log(ngx.ERR, "[B5 json_logger] timer error: ", timer_err)
    end
end

return _M
