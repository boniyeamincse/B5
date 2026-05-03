-- risk_scorer.lua
-- Tracks per-IP violation counts in a Redis sorted set.
-- Key: "risk:score"  (sorted set, member = IP, score = violation count)
-- A separate per-IP TTL key "risk:ttl:{ip}" is used to decay scores:
-- if the TTL key has expired, the member is removed before incrementing.

local _M = {}

local RISK_KEY   = "risk:score"
local TTL_PREFIX = "risk:ttl:"

-- Record a violation for the given IP.
-- Increments the sorted-set score by 1 and refreshes the decay TTL.
function _M.record(ip, decay_seconds)
    local red = _G.get_redis_connection()
    if not red then return end

    local ttl_key = TTL_PREFIX .. ip

    -- If the TTL key has expired, reset the score to 0 before incrementing
    local exists, err = red:exists(ttl_key)
    if err then
        ngx.log(ngx.ERR, "[B5 risk_scorer] redis exists error: ", err)
        _G.keepalive_redis(red)
        return
    end

    if exists == 0 then
        -- Score has decayed — remove stale member so we start fresh
        red:zrem(RISK_KEY, ip)
    end

    -- Increment score and refresh TTL
    red:zincrby(RISK_KEY, 1, ip)
    red:set(ttl_key, 1)
    red:expire(ttl_key, decay_seconds or 3600)

    _G.keepalive_redis(red)
end

-- Return the current risk score for the given IP (0 if not present).
function _M.get_score(ip)
    local red = _G.get_redis_connection()
    if not red then return 0 end

    local ttl_key = TTL_PREFIX .. ip
    local exists, err = red:exists(ttl_key)
    if err then
        ngx.log(ngx.ERR, "[B5 risk_scorer] redis exists error: ", err)
        _G.keepalive_redis(red)
        return 0
    end

    if exists == 0 then
        -- Score decayed — don't bother fetching stale entry
        _G.keepalive_redis(red)
        return 0
    end

    local score, serr = red:zscore(RISK_KEY, ip)
    _G.keepalive_redis(red)

    if serr or score == ngx.null or score == nil then
        return 0
    end
    return tonumber(score) or 0
end

-- Returns true when the IP's score meets or exceeds the block threshold.
function _M.is_high_risk(ip, threshold)
    return _M.get_score(ip) >= (threshold or 10)
end

return _M
