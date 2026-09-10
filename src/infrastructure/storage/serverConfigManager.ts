import { writeFileSync, existsSync, readFileSync, mkdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as lockfile from "proper-lockfile";
import type { CharacterInfo, GuildConfig, ServerConfig } from "@shared/types/index";
import { assertSafeServerId } from "@shared/utils/serverIdSafety";
import { extractServerIdFromUrl, normalizeServerId } from "@shared/utils/serverIdentity";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.resolve(__dirname, "data");
const SERVERS_JSON_PATH = path.resolve(__dirname, "servers.json");
const LOCKS_DIR = path.resolve(__dirname, ".locks");

type ConfigCache = {
  data: ServerConfig;
  timestamp: number;
  fileModifiedTime: number;
};

interface ServerEntry {
  id?: string;
  url: string;
  name: string;
  enabled: boolean;
  webhookUrl?: string;
}

const cache = new Map<string, ConfigCache>();

const ensureConfigDir = (): void => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

const getServerConfigPath = (serverId: string): string => {
  ensureConfigDir();
  assertSafeServerId(serverId);
  const configPath = path.resolve(CONFIG_DIR, `${serverId}.json`);
  if (path.dirname(configPath) !== CONFIG_DIR) {
    throw new Error(`serverId inválido: ${serverId}`);
  }
  return configPath;
};

const ensureLocksDir = (): void => {
  if (!existsSync(LOCKS_DIR)) {
    mkdirSync(LOCKS_DIR, { recursive: true });
  }
};

const getLockFilePath = (serverId: string): string => {
  ensureLocksDir();
  assertSafeServerId(serverId);
  const lockPath = path.resolve(LOCKS_DIR, `${serverId}.lock`);
  if (path.dirname(lockPath) !== LOCKS_DIR) {
    throw new Error(`serverId inválido: ${serverId}`);
  }
  return lockPath;
};

const getFileModifiedTime = (filePath: string): number => {
  try {
    return statSync(filePath).mtimeMs;
  } catch (err: unknown) {
    return 0;
  }
};

export { extractServerIdFromUrl };

export const loadServerConfig = (serverId: string): ServerConfig | null => {
  let configPath: string;
  try {
    configPath = getServerConfigPath(serverId);
  } catch (err: unknown) {
    return null;
  }

  const cached = cache.get(serverId);
  if (cached) {
    const currentModTime = getFileModifiedTime(configPath);
    if (currentModTime === cached.fileModifiedTime) {
      return cached.data;
    }
    cache.delete(serverId);
  }

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const data: ServerConfig = JSON.parse(raw);

    cache.set(serverId, {
      data,
      timestamp: Date.now(),
      fileModifiedTime: getFileModifiedTime(configPath),
    });

    return data;
  } catch (err) {
    console.error(`❌ Erro ao carregar ${serverId}.json:`, err);
    return null;
  }
};

const writeServerConfigUnlocked = (config: ServerConfig): ServerConfig => {
  const configPath = getServerConfigPath(config.serverId);
  const dataToSave = {
    ...config,
    lastUpdate: new Date().toISOString(),
  };

  writeFileSync(configPath, JSON.stringify(dataToSave, null, 2), "utf-8");

  cache.set(config.serverId, {
    data: dataToSave,
    timestamp: Date.now(),
    fileModifiedTime: getFileModifiedTime(configPath),
  });

  addOrUpdateServerInServersJson({
    id: config.serverId,
    url: config.guild.url,
    name: config.serverName,
    enabled: config.guild.enabled !== false,
    webhookUrl: config.guild.webhookUrl,
  });

  return dataToSave;
};

const withServerConfigLock = async <T>(serverId: string, callback: () => T | Promise<T>): Promise<T> => {
  const lockPath = getLockFilePath(serverId);
  if (!existsSync(lockPath)) {
    writeFileSync(lockPath, "", "utf-8");
  }

  let release: (() => Promise<void>) | null = null;

  try {
    release = await lockfile.lock(lockPath, {
      retries: {
        retries: 5,
        minTimeout: 100,
        maxTimeout: 1000,
      },
      stale: 10000,
    });

    return await callback();
  } finally {
    if (release) {
      try {
        await release();
      } catch (err: unknown) {
        console.error(`❌ Erro ao liberar lock de ${serverId}:`, err);
      }
    }
  }
};

export const saveServerConfig = async (config: ServerConfig): Promise<void> => {
  try {
    await withServerConfigLock(config.serverId, () => {
      writeServerConfigUnlocked(config);
    });
  } catch (err: unknown) {
    console.error(`❌ Erro ao salvar ${config.serverId}.json com lock:`, err);
    throw err;
  }
};

export const updateServerConfig = async (
  serverId: string,
  mutate: (existing: ServerConfig | null) => ServerConfig | null
): Promise<ServerConfig | null> => {
  try {
    return await withServerConfigLock(serverId, () => {
      const existing = loadServerConfig(serverId);
      const next = mutate(existing);
      return next ? writeServerConfigUnlocked(next) : null;
    });
  } catch (err: unknown) {
    console.error(`❌ Erro ao atualizar ${serverId}.json com lock:`, err);
    throw err;
  }
};

const loadServersJson = (): ServerEntry[] => {
  if (!existsSync(SERVERS_JSON_PATH)) {
    try {
      writeFileSync(SERVERS_JSON_PATH, "[\n  \n]\n", "utf-8");
    } catch (err: unknown) {
      console.error("❌ Erro ao criar servers.json:", err);
    }
    return [];
  }

  try {
    const raw = readFileSync(SERVERS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as ServerEntry[];
  } catch (err) {
    console.error("❌ Erro ao carregar servers.json:", err);
    return [];
  }
};

const syncServerFromServersJson = async (
  serverEntry: ServerEntry
): Promise<ServerConfig | null> => {
  const explicitServerId = serverEntry.id ? normalizeServerId(serverEntry.id) : "";
  const serverId = explicitServerId || extractServerIdFromUrl(serverEntry.url);
  const existingConfig = loadServerConfig(serverId);

  const guildConfig: GuildConfig = {
    url: serverEntry.url,
    enabled: serverEntry.enabled !== false,
    ...(serverEntry.webhookUrl ? { webhookUrl: serverEntry.webhookUrl } : {}),
  };

  if (existingConfig) {
    const urlChanged = existingConfig.guild.url !== serverEntry.url;
    const nameChanged = existingConfig.serverName !== serverEntry.name;
    const webhookChanged =
      serverEntry.webhookUrl !== undefined &&
      existingConfig.guild.webhookUrl !== serverEntry.webhookUrl;
    const enabledChanged = (existingConfig.guild.enabled ?? true) !== (serverEntry.enabled !== false);

    if (urlChanged || nameChanged || webhookChanged || enabledChanged) {
      const updatedConfig: ServerConfig = {
        ...existingConfig,
        serverName: serverEntry.name,
        guild: {
          ...existingConfig.guild,
          url: serverEntry.url,
          enabled: serverEntry.enabled !== false,
          ...(serverEntry.webhookUrl ? { webhookUrl: serverEntry.webhookUrl } : {}),
        },
      };
      await saveServerConfig(updatedConfig);
      cache.delete(serverId);
      return loadServerConfig(serverId);
    }

    return existingConfig;
  }

  const newConfig: ServerConfig = {
    serverId,
    serverName: serverEntry.name,
    guild: guildConfig,
    characters: {},
  };

  await saveServerConfig(newConfig);
  cache.delete(serverId);
  return loadServerConfig(serverId);
};

export const getAllServerConfigs = async (): Promise<ServerConfig[]> => {
  ensureConfigDir();

  const servers = loadServersJson();

  const configs = await Promise.all(servers.map((server) => syncServerFromServersJson(server)));

  const validConfigs = configs.filter((config): config is ServerConfig => config !== null);
  return validConfigs;
};

export const getAllServerConfigsSync = (): ServerConfig[] => {
  ensureConfigDir();
  const servers = loadServersJson();

  const configs = servers
    .map((serverEntry) => {
      const explicitServerId = serverEntry.id ? normalizeServerId(serverEntry.id) : "";
      const serverId = explicitServerId || extractServerIdFromUrl(serverEntry.url);
      return loadServerConfig(serverId);
    })
    .filter((config): config is ServerConfig => config !== null);

  return configs;
};

export const createServerConfig = (guild: GuildConfig): ServerConfig => {
  const serverId = extractServerIdFromUrl(guild.url);

  const existingConfig = loadServerConfig(serverId);
  if (existingConfig) {
    return existingConfig;
  }

  const newConfig: ServerConfig = {
    serverId,
    serverName: `Server ${serverId.replace("server", "")}`,
    guild,
    characters: {},
  };

  saveServerConfig(newConfig);

  return newConfig;
};

export const updateServerCharacters = async (
  serverId: string,
  characters: Record<string, CharacterInfo>
): Promise<boolean> => {
  const config = loadServerConfig(serverId);
  if (!config) {
    console.error(`❌ Servidor ${serverId} não encontrado`);
    return false;
  }

  const hasChanges = JSON.stringify(config.characters) !== JSON.stringify(characters);

  if (!hasChanges) {
    return false;
  }

  const updatedConfig = {
    ...config,
    characters,
  };
  await saveServerConfig(updatedConfig);

  return true;
};

export const updateServerWorkingStatus = async (
  serverId: string,
  isWorking: boolean
): Promise<void> => {
  const config = loadServerConfig(serverId);
  if (!config) return;

  if (config.isWorking === isWorking) {
    return;
  }

  const updatedConfig: ServerConfig = {
    ...config,
    isWorking,
    lastWorkingTest: new Date().toISOString(),
  };

  await saveServerConfig(updatedConfig);
  cache.delete(serverId);
};

export const getServerStats = async () => {
  const configs = await getAllServerConfigs();

  return configs.map((config) => ({
    serverId: config.serverId,
    serverName: config.serverName,
    characterCount: Object.keys(config.characters).length,
    guildEnabled: config.guild.enabled !== false,
    lastUpdate: config.lastUpdate,
  }));
};

export const deleteServerConfig = async (serverId: string): Promise<boolean> => {
  let configPath: string;
  try {
    configPath = getServerConfigPath(serverId);
  } catch (err: unknown) {
    return false;
  }
  cache.delete(serverId);

  if (existsSync(configPath)) {
    try {
      unlinkSync(configPath);
    } catch (err: unknown) {
      console.error(`Erro ao apagar arquivo ${configPath}:`, err);
    }
  }

  if (existsSync(SERVERS_JSON_PATH)) {
    try {
      const raw = readFileSync(SERVERS_JSON_PATH, "utf-8");
      const servers: ServerEntry[] = JSON.parse(raw);
      const filtered = servers.filter((entry) => {
        const id = entry.id ? normalizeServerId(entry.id) : extractServerIdFromUrl(entry.url);
        return id !== serverId;
      });
      writeFileSync(SERVERS_JSON_PATH, JSON.stringify(filtered, null, 2), "utf-8");
    } catch (err: unknown) {
      console.error("Erro ao atualizar servers.json na exclusão:", err);
    }
  }

  return true;
};

export const addOrUpdateServerInServersJson = (entry: ServerEntry): void => {
  try {
    let servers: ServerEntry[] = [];
    if (existsSync(SERVERS_JSON_PATH)) {
      const raw = readFileSync(SERVERS_JSON_PATH, "utf-8");
      servers = JSON.parse(raw);
    }
    const targetId = entry.id ? normalizeServerId(entry.id) : extractServerIdFromUrl(entry.url);

    const index = servers.findIndex((existingEntry) => {
      const id = existingEntry.id ? normalizeServerId(existingEntry.id) : extractServerIdFromUrl(existingEntry.url);
      return id === targetId;
    });

    const updatedServers = index >= 0
      ? servers.map((existingEntry, entryIndex) => (entryIndex === index ? { ...existingEntry, ...entry } : existingEntry))
      : [...servers, entry];

    writeFileSync(SERVERS_JSON_PATH, JSON.stringify(updatedServers, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao atualizar servers.json:", err);
  }
};

export const invalidateCache = (serverId?: string): void => {
  if (serverId) {
    cache.delete(serverId);
  } else {
    cache.clear();
  }
};
