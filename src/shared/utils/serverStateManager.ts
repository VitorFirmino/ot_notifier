import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { ServerState, ServerStates } from "../types/serverState";
import lockfile from "proper-lockfile";

const STATE_FILE = join(process.cwd(), "data", ".server-states.json");

try {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
} catch {}

const loadStatesSync = (): ServerStates => {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
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

    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    const current = states[serverId] || { name: serverId, serverId };
    
    states[serverId] = updater(current);
    
    writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), "utf-8");
  } catch (error) {
    const states = loadStatesSync();
    states[serverId] = updater(states[serverId] || { name: serverId, serverId });
    writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), "utf-8");
  } finally {
    if (release) await release();
  }
};

export const updateServerState = async (
  serverId: string,
  update: Partial<ServerState>
): Promise<void> => {
  await atomicUpdate(serverId, (current) => {
    const newState = {
      ...current,
      ...update,
      serverId,
      name: update.name || current.name || serverId,
    };

    if (update.processing === null) delete newState.processing;
    if (update.verifying === null) delete newState.verifying;
    if (update.warn === null) delete newState.warn;
    if (update.nextCheck === null) delete newState.nextCheck;

    return newState;
  });
};

export const clearServerState = async (serverId: string): Promise<void> => {
  let release;
  try {
    release = await lockfile.lock(STATE_FILE, { retries: 5 });
    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    delete states[serverId];
    writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), "utf-8");
  } catch {
  } finally {
    if (release) await release();
  }
};

export const cleanupServerStates = async (activeServerIds: string[]): Promise<void> => {
  let release;
  try {
    if (!existsSync(STATE_FILE)) return;
    release = await lockfile.lock(STATE_FILE, { retries: 5 });
    
    const states = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    let changed = false;

    for (const serverId of Object.keys(states)) {
      if (!activeServerIds.includes(serverId)) {
        delete states[serverId];
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), "utf-8");
    }
  } catch {
  } finally {
    if (release) await release();
  }
};

export const getAllServerStates = (): ServerStates => {
  return loadStatesSync();
};

export const clearProcessingState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { processing: null } as any);
};

export const clearVerifyingState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { verifying: null } as any);
};

export const clearNextCheckState = async (serverId: string): Promise<void> => {
  await updateServerState(serverId, { nextCheck: null } as any);
};
