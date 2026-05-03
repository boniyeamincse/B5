local _M = {}

function _M.inspect(body, content_type, forbidden_exts)
    if not body or body == "" then
        return nil
    end

    if not content_type then
        return nil
    end

    -- Only process multipart/form-data requests
    if not ngx.re.match(content_type, [[(?i)^multipart/form-data]], "jo") then
        return nil
    end

    -- Scan all Content-Disposition filename= values within the body
    local it = ngx.re.gmatch(body, [[filename=["']?([^"'\r\n;]+)["']?]], "jo")
    if not it then
        return nil
    end

    while true do
        local m = it()
        if not m then
            break
        end

        local filename = m[1]
        if filename then
            local ext_match = ngx.re.match(filename, [[\.([a-zA-Z0-9]+)$]], "jo")
            if ext_match then
                local ext = ext_match[1]:lower()
                for _, forbidden in ipairs(forbidden_exts or {}) do
                    if ext == forbidden:lower() then
                        return filename
                    end
                end
            end
        end
    end

    return nil
end

return _M
