local _M = {}

function _M.extract()
    ngx.req.read_body()

    local headers = ngx.req.get_headers()
    local request_uri = ngx.var.request_uri or ""
    local normalized_uri = request_uri ~= "" and ngx.unescape_uri(request_uri) or ""

    local body = ngx.req.get_body_data() or ""

    return {
        client_ip = ngx.var.remote_addr,
        method = ngx.req.get_method(),
        uri = request_uri,
        normalized_uri = normalized_uri,
        path = ngx.var.uri,
        query_string = ngx.var.args,
        headers = headers,
        host = headers.host or ngx.var.host,
        user_agent = headers["user-agent"],
        body = body,
    }
end

return _M