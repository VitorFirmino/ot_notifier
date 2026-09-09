export type DeathInfo = {
  level: number;
  killers: string[];
  deathText: string;
  time?: string;
  date?: string;
};

export type CharacterInfo = {
  url: string;
  last_level: number | null;
  up_streak?: number;
  last_milestone?: number;
  last_death?: DeathInfo | null;
  isOnline?: boolean;
  vocation?: string;
  residence?: string;
  sex?: string;
  guildName?: string;
  guildRank?: string;
  accountStatus?: string;
};

export type CharacterGuildInfo = {
  name: string;
  rank?: string;
};

export type CharacterDetails = {
  exists?: boolean;
  name: string;
  serverName?: string;
  serverId?: string;
  url?: string;
  level: number;
  vocation?: string;
  residence?: string;
  sex?: string;
  guild?: CharacterGuildInfo;
  accountStatus?: string;
  isOnline: boolean;
  lastLogin?: string;
  createdAt?: string;
  up_streak?: number;
  last_milestone?: number;
  deaths?: DeathInfo[];
  error?: string;
};

export type GuildConfig = {
  url: string;
  webhookUrl?: string;
  enabled?: boolean;
  logoUrl?: string;
  emblemUrl?: string;
  kills?: string;
  world?: string;
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

export type GuildDiscovered = {
  name: string;
  url: string;
  logoUrl?: string;
  kills?: string;
  world?: string;
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
  liveState?: {
    processing?: { totalCharacters: number; processed: number; startTime: number; isInitialSync: boolean };
    verifying?: { totalCharacters: number; processed: number; startTime: number; elapsed: number };
  };
};

export type AddServerPayload = {
  url: string;
  name?: string;
  webhookUrl?: string;
  logoUrl?: string;
  kills?: string;
  world?: string;
};

export type UpdateServerPayload = {
  serverName?: string;
  enabled?: boolean;
  webhookUrl?: string;
  logoUrl?: string;
  guild?: Partial<GuildConfig>;
  settings?: Partial<ServerConfig["settings"]>;
};

export type InspectCharacterParams = {
  name: string;
  url?: string;
  serverId?: string;
};

export type DiscoverGuildsPayload = {
  url: string;
};

export type DiscoverGuildsResponse = {
  guilds: GuildDiscovered[];
  htmlLength?: number;
};

export type SystemStatsResponse = {
  activeServers: number;
  totalServers: number;
  monitoredCharacters: number;
  onlineCharacters: number;
  antiBotStatus: string;
  antiBotChecks: number;
};

export type ServerWebhookConfig = {
  guild: { webhookUrl?: string };
  serverId: string;
};

export type EventType = "level_up" | "level_down" | "death" | "guild_sync";

export type ActivityEvent = {
  id: string;
  timestamp: string;
  serverId: string;
  serverName: string;
  type: EventType;
  characterName?: string;
  level?: number;
  previousLevel?: number;
  killers?: string[];
  details?: string;
  streak?: number;
  milestone?: number;
  webhookSent: boolean;
};
