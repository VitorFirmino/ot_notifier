import { spawn, type ChildProcess } from "child_process";
import { join } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "@shared/utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProcessState {
  processes: Map<string, ChildProcess>;
  workerPath: string;
}

const createProcessState = (): ProcessState => {
  const workerPath = join(__dirname, "..", "workers", "serverWorker.ts");
  return {
    processes: new Map<string, ChildProcess>(),
    workerPath,
  };
};

const processState = createProcessState();

const setupEventHandlers = (serverId: string, childProcess: ChildProcess): void => {
  const logBuffer: string[] = [];
  const showWorkerStdErr = process.env.SHOW_WORKER_STDERR === "true";

  childProcess.stderr?.on("data", (data) => {
    const message = data.toString();
    if (!message.includes("dotenv") && !message.includes("injecting env")) {
      const trimmed = message.trim();
      if (trimmed.length > 0) {
        if (trimmed.includes("DEBUG") || trimmed.includes("Webhook") || trimmed.includes("❌")) {
          logBuffer.push(`[${serverId}] ${trimmed}`);
          if (logBuffer.length > 10) {
            logBuffer.shift();
          }
        } else if (showWorkerStdErr) {
          logger.error(`[${serverId}] ${trimmed}`);
        }
      }
    }
  });

  childProcess.stdout?.on("data", (data) => {
    const message = data.toString();
    if (
      message.includes("DEBUG") ||
      message.includes("Webhook") ||
      message.includes("level") ||
      message.includes("Mudança") ||
      message.includes("❌")
    ) {
      logBuffer.push(`[${serverId}] ${message.trim()}`);
      if (logBuffer.length > 10) {
        logBuffer.shift();
      }
    }
  });

  childProcess.on("error", (error) => {
    logger.error(`[${serverId}] Erro no processo:`, error);
  });

  childProcess.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      logger.error(`[${serverId}] Processo finalizado com código ${code} e signal ${signal}`);

      if (processState.processes.has(serverId)) {
        setTimeout(() => {
          logger.info(`[${serverId}] Reiniciando processo...`);
          processState.processes.delete(serverId);
          startServerProcess(serverId);
        }, 5000);
      }
    } else {
      processState.processes.delete(serverId);
    }
  });
};

export const startServerProcess = (serverId: string): ChildProcess => {
  try {
    const childProcess = spawn("npx", ["tsx", processState.workerPath, serverId], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, SERVER_ID: serverId },
    });

    setupEventHandlers(serverId, childProcess);
    processState.processes.set(serverId, childProcess);

    return childProcess;
  } catch (error) {
    logger.error(`[${serverId}] Erro ao criar processo:`, error);
    throw error;
  }
};

const shutdownSingleProcess = (serverId: string, proc: ChildProcess): Promise<void> => {
  return new Promise((resolve) => {
    if (!proc || proc.killed) {
      resolve();
      return;
    }

    let killed = false;

    const forceKill = setTimeout(() => {
      if (!killed && !proc.killed) {
        try {
          proc.kill("SIGKILL");
          killed = true;
        } catch (error) {
          console.error(error);
        }
      }
      resolve();
    }, 2000);

    const cleanup = () => {
      if (!killed) {
        clearTimeout(forceKill);
        killed = true;
      }
      resolve();
    };

    proc.once("exit", cleanup);

    try {
      if (!proc.killed) {
        proc.kill("SIGTERM");
      } else {
        cleanup();
      }
    } catch (err: unknown) {
      console.warn(`Error sending SIGTERM to ${serverId}:`, err);
      cleanup();
    }
  });
};

export const shutdownAllProcesses = async (): Promise<void> => {
  if (processState.processes.size === 0) {
    return;
  }

  const shutdownPromises = Array.from(processState.processes.entries()).map(([serverId, proc]) =>
    shutdownSingleProcess(serverId, proc)
  );

  await Promise.allSettled(shutdownPromises);

  processState.processes.clear();
};

export const getProcessCount = (): number => {
  return processState.processes.size;
};
