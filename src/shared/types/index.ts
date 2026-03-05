export type DeathInfo = {
  level: number;
  killers: string[];
  deathText: string;
  time?: string;
};

export type CharacterInfo = {
  url: string;
  last_level: number | null;
  up_streak?: number;
  last_milestone?: number;
  last_death?: DeathInfo | null;
};

export type GuildConfig = {
  url: string;
  webhookUrl?: string;
  enabled?: boolean;
};

export type Config = {
  guilds: GuildConfig[];
  characters: Record<string, CharacterInfo>;
};

export type Character = {
  name: string;
  last_level: number;
};

export type GuildMember = {
  name: string;
  url: string;
};

export type CharacterStatus = {
  name: string;
  url: string;
  level: number | null;
  isOnline: boolean;
  lastDeath: DeathInfo | null;
};

export type ProcessCharacterResult = {
  name: string;
  level: number | null;
  isOnline: boolean;
  lastDeath: DeathInfo | null;
  error?: string;
};

export type SendWebhookParams = {
  webhookUrl: string;
  name: string;
  currentLevel: number;
  status: "up" | "down";
  upStreak?: number;
  milestoneReached?: number;
};

export type SendGuildWebhookParams = {
  webhookUrl: string;
  newMembers: string[];
  totalMembers: number;
};

export type SendDeathWebhookParams = {
  webhookUrl: string;
  name: string;
  deathLevel: number;
  killers: string[];
  deathText: string;
  time?: string;
};

export type ServerConfig = {
  serverId: string;
  serverName: string;
  guild: GuildConfig;
  characters: Record<string, CharacterInfo>;
  lastUpdate?: string;
  hasCloudflare?: boolean;
  cloudflareDetectedAt?: string;
  isWorking?: boolean;
  lastWorkingTest?: string;
  settings?: {
    concurrency?: number;
    checkInterval?: number;
    idleCheckInterval?: number;
    emptyGuildCheckInterval?: number;
    protectedCheckInterval?: number;
    requestDelay?: number;
    batchSize?: number;
    headers?: Record<string, string>;
  };
};
