local _M = {}

local function get_redis_value(red, key)
    local value, err = red:get(key)
    if err then
        return nil, err
    end

    if value == ngx.null then
        return nil
    end

    return value
end

function _M.check(client_ip)
    if not client_ip or client_ip == "" then
        return nil, "missing client IP"
    end

    if type(_G.get_redis_connection) ~= "function" then
        return nil, "redis helper unavailable"
    end

    local red = _G.get_redis_connection()
    if not red then
        return nil, "redis unavailable"
    end

    local block_value, block_err = get_redis_value(red, "block:" .. client_ip)
    if block_err then
        _G.keepalive_redis(red)
        return nil, block_err
    end

    if block_value then
        _G.keepalive_redis(red)
        return "block", block_value
    end

    local allow_value, allow_err = get_redis_value(red, "allow:" .. client_ip)
    if allow_err then
        _G.keepalive_redis(red)
        return nil, allow_err
    end

    _G.keepalive_redis(red)

    if allow_value then
        return "allow", allow_value
    end

    return nil
end

return _M