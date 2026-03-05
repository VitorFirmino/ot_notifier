import { writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Config, CharacterInfo, GuildMember, GuildConfig } from "@shared/types/index";
import { createConfigCache } from "./configCache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, "config.json");
const DEFAULT_CONFIG: Config = { guilds: [], characters: {} };

const configCache = createConfigCache(CONFIG_PATH);

const createDefaultCharacter = (url: string): CharacterInfo => ({
  url,
  last_level: null,
  up_streak: 0,
  last_milestone: 0,
});

const shouldResetLevel = ({ last_level, up_streak, last_milestone }: CharacterInfo): boolean =>
  last_level === 0 && up_streak === 0 && last_milestone === 0;

const ensureCharacterDefaults = (character: CharacterInfo): CharacterInfo => {
  const normalized: CharacterInfo = {
    ...character,
    up_streak: character.up_streak ?? 0,
    last_milestone: character.last_milestone ?? 0,
    last_death: character.last_death ?? null,
  };

  return shouldResetLevel(normalized) ? { ...normalized, last_level: null } : normalized;
};

const extractServerIdFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    const match = hostname.match(/^(server\d+)/i);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
};

const groupCharactersByServer = (
  characters: Record<string, CharacterInfo>
): Record<string, Record<string, CharacterInfo>> => {
  const grouped: Record<string, Record<string, CharacterInfo>> = {};

  Object.entries(characters).forEach(([name, char]) => {
    const serverId = extractServerIdFromUrl(char.url);

    if (!grouped[serverId]) {
      grouped[serverId] = {};
    }

    grouped[serverId][name] = char;
  });

  return grouped;
};

export const saveConfig = (config: Config): void => {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  configCache.set(config);
  console.log("💾 Config salvo no disco");
};

const parseConfig = (raw: string): Config => {
  const parsed: Config = JSON.parse(raw);

  const normalizedCharacters = Object.entries(parsed.characters ?? {}).reduce(
    (acc, [name, character]) => ({
      ...acc,
      [name]: ensureCharacterDefaults(character),
    }),
    {}
  );

  return {
    guilds: parsed.guilds ?? [],
    characters: normalizedCharacters,
  };
};

const loadConfigFromDisk = (): Config => {
  if (!existsSync(CONFIG_PATH)) {
    console.warn("⚠️ config.json não encontrado. Criando novo...");
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  if (!raw.trim()) {
    console.warn("⚠️ config.json vazio. Usando configuração padrão.");
    return DEFAULT_CONFIG;
  }

  try {
    return parseConfig(raw);
  } catch {
    console.error("❌ Erro ao parsear config.json. Verifique o JSON.");
    process.exit(1);
  }
};

export const loadConfig = (): Config => {
  const cached = configCache.get();

  if (cached) {
    return cached;
  }

  console.log("📂 Carregando config.json do disco");
  const config = loadConfigFromDisk();
  configCache.set(config);

  return config;
};

export const invalidateConfigCache = (): void => {
  configCache.invalidate();
  console.log("🗑️ Cache do config invalidado");
};

export const getConfigCacheStats = () => {
  return configCache.getStats();
};

const hasCharacterChanged = (existing: CharacterInfo, updated: CharacterInfo): boolean => {
  const fields = ["url", "last_level", "up_streak", "last_milestone"] as const;

  return (
    fields.some((field) => existing[field] !== updated[field]) ||
    JSON.stringify(existing.last_death) !== JSON.stringify(updated.last_death)
  );
};

const hasGuildsChanged = (oldGuilds: GuildConfig[], newGuilds: GuildConfig[]): boolean =>
  JSON.stringify(oldGuilds) !== JSON.stringify(newGuilds);

const hasCharacterCountChanged = (
  oldChars: Record<string, CharacterInfo>,
  newChars: Record<string, CharacterInfo>
): boolean => Object.keys(oldChars).length !== Object.keys(newChars).length;

const hasAnyCharacterChanged = (
  oldChars: Record<string, CharacterInfo>,
  newChars: Record<string, CharacterInfo>
): boolean =>
  Object.keys(newChars).some((name) => {
    const oldChar = oldChars[name];
    const newChar = newChars[name];
    return !oldChar || hasCharacterChanged(oldChar, newChar);
  });

export const saveConfigIfChanged = (newConfig: Config, oldConfig: Config): boolean => {
  const shouldSave =
    hasCharacterCountChanged(oldConfig.characters, newConfig.characters) ||
    hasGuildsChanged(oldConfig.guilds, newConfig.guilds) ||
    hasAnyCharacterChanged(oldConfig.characters, newConfig.characters);

  if (shouldSave) {
    saveConfig(newConfig);
    return true;
  }

  return false;
};

const processMember = (
  characters: Record<string, CharacterInfo>,
  { name, url }: GuildMember,
  stats: { added: number; updated: number; names: string[] }
): Record<string, CharacterInfo> => {
  const existing = characters[name];

  if (existing) {
    if (existing.url !== url) {
      stats.updated++;
      return {
        ...characters,
        [name]: { ...existing, url },
      };
    }
    return characters;
  }

  stats.names.push(name);
  stats.added++;
  return {
    ...characters,
    [name]: createDefaultCharacter(url),
  };
};

export const syncGuildMembers = (
  members: GuildMember[],
  onNewMembers?: (names: string[]) => void
): Config => {
  const config = loadConfig();
  const stats = { added: 0, updated: 0, names: [] as string[] };

  const updatedCharacters = members.reduce(
    (acc, member) => processMember(acc, member, stats),
    config.characters
  );

  const updatedConfig = {
    ...config,
    characters: updatedCharacters,
  };

  if (stats.added === 0 && stats.updated === 0) {
    console.log("✅ Todos os membros já estão sincronizados");
    return config;
  }

  saveConfig(updatedConfig);
  console.log(
    `✅ Sincronização concluída: ${stats.added} novos membros adicionados, ${stats.updated} URLs atualizadas`
  );

  onNewMembers?.(stats.names);

  return updatedConfig;
};

export const addOrUpdateGuild = (guildConfig: GuildConfig): Config => {
  const config = loadConfig();
  const existingIndex = config.guilds.findIndex(({ url }: GuildConfig) => url === guildConfig.url);

  const updatedGuilds =
    existingIndex >= 0
      ? config.guilds.map((guild: GuildConfig, idx: number) =>
          idx === existingIndex ? guildConfig : guild
        )
      : [...config.guilds, guildConfig];

  const updatedConfig = { ...config, guilds: updatedGuilds };
  saveConfig(updatedConfig);

  return updatedConfig;
};

export const getEnabledGuilds = ({ guilds }: Config): GuildConfig[] =>
  guilds.filter(({ enabled }: GuildConfig) => enabled !== false);

export const getCharactersByServer = (
  config: Config
): Record<string, Record<string, CharacterInfo>> => {
  return groupCharactersByServer(config.characters);
};

export const getServerStats = (config: Config) => {
  const byServer = groupCharactersByServer(config.characters);

  return Object.entries(byServer).map(([serverId, chars]) => ({
    serverId,
    count: Object.keys(chars).length,
  }));
};
