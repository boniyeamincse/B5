local _M = {}

function _M.detect(input, patterns)
    if not input or input == "" then
        return nil
    end

    for _, pattern in ipairs(patterns or {}) do
        if ngx.re.match(input, pattern, "ijo") then
            return pattern
        end
    end

    return nil
end

return _M