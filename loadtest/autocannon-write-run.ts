import fs from "node:fs";
import autocannon from "autocannon";
import { LOADTEST_SESSION_FILE } from "./config";

const session = JSON.parse(fs.readFileSync(LOADTEST_SESSION_FILE, "utf-8")) as {
  apiBase: string;
  cookie: string;
  serverIds: string[];
};

const main = async (): Promise<void> => {
  const targetServerId = session.serverIds[0];
  console.log(`Hammering PUT /api/servers/${targetServerId} from 20 concurrent connections (lock contention).`);

  const result = await autocannon({
    url: `${session.apiBase}/api/servers/${targetServerId}`,
    method: "PUT",
    connections: 20,
    duration: 15,
    headers: { Cookie: session.cookie, "Content-Type": "application/json", Origin: session.apiBase },
    body: JSON.stringify({ settings: { checkInterval: 120 } }),
  });
  console.log(autocannon.printResult(result));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
