import dotenv from "dotenv";
import { runServerLoop, gracefulShutdown } from "./handlers/serverLoopHandler";

dotenv.config({ quiet: true });

process.once("SIGTERM", () => {
  gracefulShutdown("SIGTERM").catch(() => {
    process.exit(0);
  });
});

process.once("SIGINT", () => {
  gracefulShutdown("SIGINT").catch(() => {
    process.exit(0);
  });
});

runServerLoop().catch(() => {
  process.exit(1);
});
