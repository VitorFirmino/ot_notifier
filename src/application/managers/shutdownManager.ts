import { logger } from "@shared/utils/logger";
import { shutdownAllProcesses } from "./processManager";
import { stopRenderLoop } from "./renderManager";
import { clearRender } from "@shared/utils/blockRenderer";
import { stopServerQueueWorker } from "../workers/queueWorker";

interface ShutdownState {
  shutdownInProgress: boolean;
  signalHandled: boolean;
}

let shutdownState: ShutdownState = {
  shutdownInProgress: false,
  signalHandled: false,
};

export const shutdown = async (): Promise<void> => {
  if (shutdownState.shutdownInProgress) {
    process.exit(0);
  }

  shutdownState = {
    ...shutdownState,
    shutdownInProgress: true,
  };

  try {
    stopRenderLoop();
    clearRender();

    const shutdownPromise = Promise.all([shutdownAllProcesses(), stopServerQueueWorker()]);
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2500);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);

    process.exit(0);
  } catch (error) {
    logger.error("Erro durante shutdown:", error);
    process.exit(1);
  }
};

export const handleShutdown = (signal: string): void => {
  if (shutdownState.signalHandled) {
    logger.warn(`${signal} já processado, forçando saída...`);
    process.exit(1);
  }

  shutdownState = {
    ...shutdownState,
    signalHandled: true,
  };

  shutdown().catch((error) => {
    logger.error(`Erro no shutdown ${signal}:`, error);
    process.exit(1);
  });
};

export const setupShutdownHandlers = (): void => {
  let forceExitTimeout: NodeJS.Timeout | null = null;

  const handleSignal = (signal: string): void => {
    console.log(`\nEncerrando...`);

    if (forceExitTimeout) {
      console.log("Exit");
      process.exit(1);
    }

    forceExitTimeout = setTimeout(() => {
      console.log("Exit");
      process.exit(1);
    }, 3000);

    handleShutdown(signal);
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  process.on("uncaughtException", (error) => {
    logger.error("Erro não capturado:", error);
    shutdown().catch((err: unknown) => {
      logger.error("Fatal error during uncaught exception shutdown:", err);
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Promise rejeitada não tratada:", reason);
    logger.error("Promise:", promise);
  });
};
