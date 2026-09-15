import http from "k6/http";
import { check } from "k6";
import { SharedArray } from "k6/data";

const session = new SharedArray("session", () => [JSON.parse(open("./.session.json"))]);

export const options = {
  scenarios: {
    ramping: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5s", target: 5 },
        { duration: "10s", target: 20 },
        { duration: "10s", target: 50 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

const pickServerId = (serverIds) => serverIds[Math.floor(Math.random() * serverIds.length)];

export default function () {
  const { apiBase, cookie, serverIds } = session[0];
  const headers = { Cookie: cookie };
  const roll = Math.random();

  if (roll < 0.7) {
    const response = http.get(`${apiBase}/api/servers`, { headers });
    check(response, { "GET /api/servers is 200": (r) => r.status === 200 });
  } else if (roll < 0.85) {
    const response = http.get(`${apiBase}/api/stats`, { headers });
    check(response, { "GET /api/stats is 200": (r) => r.status === 200 });
  } else if (roll < 0.95) {
    const response = http.get(`${apiBase}/api/events`, { headers });
    check(response, { "GET /api/events is 200": (r) => r.status === 200 });
  } else {
    const serverId = pickServerId(serverIds);
    const response = http.put(
      `${apiBase}/api/servers/${serverId}`,
      JSON.stringify({ settings: { checkInterval: 60 + Math.floor(Math.random() * 300) } }),
      { headers: { ...headers, "Content-Type": "application/json", Origin: apiBase } }
    );
    check(response, { "PUT /api/servers/:id is 200": (r) => r.status === 200 });
  }
}
