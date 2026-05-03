local _M = {}
local cjson = require "cjson.safe"

local LOG_PATH = "/usr/local/openresty/nginx/logs/waf_events.log"

function _M.log(event)
    event.timestamp = ngx.utctime()
    event.mode      = _G.B5_CONFIG and _G.B5_CONFIG.mode or "unknown"

    local line, err = cjson.encode(event)
    if not line then
        ngx.log(ngx.ERR, "[B5 json_logger] cjson encode error: ", err)
        return
    end

    local f, ferr = io.open(LOG_PATH, "a")
    if not f then
        ngx.log(ngx.ERR, "[B5 json_logger] failed to open log file: ", ferr)
        return
    end
    f:write(line .. "\n")
    f:close()
end

return _M
