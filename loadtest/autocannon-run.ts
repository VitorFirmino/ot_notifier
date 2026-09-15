import fs from "node:fs";
import autocannon from "autocannon";
import { LOADTEST_SESSION_FILE } from "./config";

const session = JSON.parse(fs.readFileSync(LOADTEST_SESSION_FILE, "utf-8")) as {
  apiBase: string;
  cookie: string;
};

const main = async (): Promise<void> => {
  const result = await autocannon({
    url: `${session.apiBase}/api/servers`,
    headers: { Cookie: session.cookie },
    connections: 50,
    duration: 15,
  });
  console.log(autocannon.printResult(result));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
