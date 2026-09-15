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

export default function () {
  const { apiBase, cookie } = session[0];
  const response = http.get(`${apiBase}/api/servers`, { headers: { Cookie: cookie } });
  check(response, {
    "status is 200": (r) => r.status === 200,
  });
}
