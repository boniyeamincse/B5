local _M = {}
local cjson = require "cjson.safe"

-- Validates that the request body is well-formed JSON.
-- Returns nil on success, or an error string on failure.
function _M.validate(body)
    if not body or body == "" then
        return nil  -- empty body is not a JSON request; skip
    end

    local ok, err = cjson.decode(body)
    if not ok then
        return err or "invalid JSON"
    end

    return nil
end

return _M
