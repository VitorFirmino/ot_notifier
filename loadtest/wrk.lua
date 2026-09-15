-- Cookie set via env var by run-wrk.sh — wrk's Lua has no JSON parser to read .session.json directly.
wrk.method = "GET"
wrk.path = "/api/servers"
wrk.headers["Cookie"] = os.getenv("LOADTEST_COOKIE")
