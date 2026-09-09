import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { ServerState, ServerStates } from "../types/serverState";
import lockfile from "proper-lockfile";

const STATE_FILE = join(process.cwd(), "data", ".server-states.json");

try {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
} catch (err: unknown) {
  if ((err as { code?: string })?.code !== "EEXIST") {
    console.warn("Failed to create data directory:", err);
  }
}

const loadStatesSync = (): ServerStates => {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as ServerStates;
  } catch (err: unknown) {
    console.warn("Failed to read server states JSON file:", err);
    return {};
  }
};

export const atomicUpdate = async (
  serverId: string,
  updater: (current: ServerState) => ServerState
): Promise<void> => {
  if (!existsSync(STATE_FILE)) {
    writeFileSync(STATE_FILE, "{}", "utf-8");
  }

  let release;
  try {
    release = await lockfile.lock(STATE_FILE, {
      retries: { retries: 10, minTimeout: 50, maxTimeout: 200 },
      stale: 10000,
    });

    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as ServerStates;
    const current = states[serverId] || { name: serverId, serverId };

    const updatedState = updater(current);
    const newStates: ServerStates = {
      ...states,
      [serverId]: updatedState,
    };

    writeFileSync(STATE_FILE, JSON.stringify(newStates, null, 2), "utf-8");
  } catch (error: unknown) {
    console.warn(`Fallback state update for ${serverId}:`, error);
    const states = loadStatesSync();
    const current = states[serverId] || { name: serverId, serverId };
    const updatedState = updater(current);
    const newStates: ServerStates = {
      ...states,
      [serverId]: updatedState,
    };
    writeFileSync(STATE_FILE, JSON.stringify(newStates, null, 2), "utf-8");
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseErr: unknown) {
        console.warn("Error releasing lockfile:", releaseErr);
      }
    }
  }
};

export const updateServerState = async (
  serverId: string,
  update: Partial<ServerState>
): Promise<void> => {
  await atomicUpdate(serverId, (current) => {
    const baseState: ServerState = {
      ...current,
      ...update,
      serverId,
      name: update.name || current.name || serverId,
    };

    const {
      processing: _proc,
      verifying: _ver,
      warn: _warn,
      nextCheck: _next,
      ...rest
    } = baseState;

    const finalState: ServerState = {
      ...rest,
      processing: update.processing === null ? undefined : baseState.processing,
      verifying: update.verifying === null ? undefined : baseState.verifying,
      warn: update.warn === null ? undefined : baseState.warn,
      nextCheck: update.nextCheck === null ? undefined : baseState.nextCheck,
    };

    return finalState;
  });
};

export const clearServerState = async (serverId: string): Promise<void> => {
  let release;
  try {
    release = await lockfile.lock(STATE_FILE, { retries: 5 });
    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as ServerStates;
    
    const { [serverId]: _removed, ...newStates } = states;
    writeFileSync(STATE_FILE, JSON.stringify(newStates, null, 2), "utf-8");
  } catch (err: unknown) {
    console.warn(`Failed to clear server state for ${serverId}:`, err);
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseErr: unknown) {
        console.warn("Error releasing lockfile:", releaseErr);
      }
    }
  }
};

export const cleanupServerStates = async (activeServerIds: string[]): Promise<void> => {
  let release;
  try {
    if (!existsSync(STATE_FILE)) return;
    release = await lockfile.lock(STATE_FILE, { retries: 5 });

    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as ServerStates;
    const newStates = Object.fromEntries(
      Object.entries(states).filter(([id]) => activeServerIds.includes(id))
    );

    if (Object.keys(states).length !== Object.keys(newStates).length) {
      writeFileSync(STATE_FILE, JSON.stringify(newStates, null, 2), "utf-8");
    }
  } catch (err: unknown) {
    console.warn("Failed to cleanup server states:", err);
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseErr: unknown) {
        console.warn("Error releasing lockfile:", releaseErr);
      }
    }
  }
};

export const getAllServerStates = (): ServerStates => {
  return loadStatesSync();
};

export const clearProcessingState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { processing: null });
};

export const clearVerifyingState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { verifying: null });
};

export const clearNextCheckState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { nextCheck: null });
};
