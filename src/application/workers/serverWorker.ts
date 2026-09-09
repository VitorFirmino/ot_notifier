import dotenv from "dotenv";
import { runServerLoop, gracefulShutdown } from "./handlers/serverLoopHandler";

dotenv.config({ quiet: true });

process.once("SIGTERM", () => {
  gracefulShutdown("SIGTERM").catch((err: unknown) => {
    console.error("Error during SIGTERM graceful shutdown:", err);
    process.exit(0);
  });
});

process.once("SIGINT", () => {
  gracefulShutdown("SIGINT").catch((err: unknown) => {
    console.error("Error during SIGINT graceful shutdown:", err);
    process.exit(0);
  });
});

runServerLoop().catch((err: unknown) => {
  console.error("Fatal error in server loop:", err);
  process.exit(1);
});
