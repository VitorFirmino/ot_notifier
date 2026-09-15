local cookie = os.getenv("LOADTEST_COOKIE")
local serverIds = {}
for id in string.gmatch(os.getenv("LOADTEST_SERVER_IDS"), "[^,]+") do
  table.insert(serverIds, id)
end

wrk.method = "PUT"
wrk.headers["Cookie"] = cookie
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Origin"] = os.getenv("LOADTEST_API_BASE")
wrk.body = '{"settings":{"checkInterval":120}}'

local requestIndex = 0

request = function()
  requestIndex = requestIndex + 1
  local serverId = serverIds[(requestIndex % #serverIds) + 1]
  return wrk.format(wrk.method, "/api/servers/" .. serverId, wrk.headers, wrk.body)
end
