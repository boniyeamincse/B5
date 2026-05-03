local _M = {}

-- Redis sliding window rate limiter.
-- Key schema: rl:{identifier}
-- Each request adds an entry (score = epoch_ms, member = unique token).
-- Entries older than the window are pruned on every check.
function _M.check(identifier, max_requests, window_seconds)
    if not identifier or identifier == "" then
        return nil, "missing identifier"
    end

    if type(_G.get_redis_connection) ~= "function" then
        return nil, "redis helper unavailable"
    end

    local red = _G.get_redis_connection()
    if not red then
        return nil, "redis unavailable"
    end

    local now_ms   = ngx.now() * 1000
    local window_ms = window_seconds * 1000
    local cutoff   = now_ms - window_ms
    local key      = "rl:" .. identifier
    -- Use a unique member to avoid score collisions
    local member   = tostring(now_ms) .. ":" .. tostring(math.random(2147483647))

    -- Pipeline: prune old, add current, count, set TTL
    red:init_pipeline()
    red:zremrangebyscore(key, 0, cutoff)
    red:zadd(key, now_ms, member)
    red:zcard(key)
    red:expire(key, window_seconds)
    local results, err = red:commit_pipeline()

    _G.keepalive_redis(red)

    if not results then
        return nil, "pipeline error: " .. (err or "unknown")
    end

    -- results[3] is the ZCARD response (1-indexed: zremrangebyscore, zadd, zcard, expire)
    local count = tonumber(results[3])
    if not count then
        return nil, "unexpected zcard result"
    end

    if count > max_requests then
        return "limited", count
    end

    return nil, count
end

return _M
