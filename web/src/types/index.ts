export interface DeathInfo {
  date?: string;
  time?: string;
  level: number;
  killers: string[];
  deathText: string;
}

export interface CharacterInfo {
  name?: string;
  url: string;
  last_level: number;
  up_streak?: number;
  last_milestone?: number;
  isOnline?: boolean;
  lastDeath?: DeathInfo | null;
  vocation?: string;
  residence?: string;
  sex?: string;
  guildName?: string;
  guildRank?: string;
  accountStatus?: string;
}

export interface CharacterGuildInfo {
  name: string;
  rank?: string;
}

export interface CharacterDetails {
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
}

export interface GuildConfig {
  url: string;
  webhookUrl?: string;
  enabled?: boolean;
  logoUrl?: string;
  emblemUrl?: string;
  kills?: string;
  world?: string;
}

export interface ServerSettings {
  concurrency?: number;
  requestDelay?: number;
  checkInterval?: number;
  batchSize?: number;
}

export interface ServerConfig {
  serverId: string;
  serverName: string;
  guild: GuildConfig;
  characters: Record<string, CharacterInfo>;
  lastUpdate?: string;
  hasCloudflare?: boolean;
  cloudflareDetectedAt?: string;
  isWorking?: boolean;
  lastWorkingTest?: string;
  settings?: ServerSettings;
  liveState?: {
    processing?: { totalCharacters: number; processed: number; startTime: number; isInitialSync: boolean };
    verifying?: { totalCharacters: number; processed: number; startTime: number; elapsed: number };
  };
}

export type EventType = 'level_up' | 'level_down' | 'death' | 'guild_sync';

export interface ActivityEvent {
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
}

export interface SystemStats {
  activeWorkers: number;
  monitoredGuilds: number;
  totalCharacters: number;
  onlineCharacters: number;
  notifications24h: number;
  cloudflareBypasses: number;
}

export interface GuildDiscovered {
  name: string;
  url: string;
  logoUrl?: string;
  kills?: string;
  world?: string;
}

export interface AddServerPayload {
  url: string;
  name?: string;
  webhookUrl?: string;
  logoUrl?: string;
  kills?: string;
  world?: string;
}

export interface UpdateServerPayload {
  serverName?: string;
  enabled?: boolean;
  webhookUrl?: string;
  logoUrl?: string;
  guild?: Partial<GuildConfig>;
  settings?: Partial<ServerSettings>;
}

export interface InspectCharacterParams {
  name: string;
  url?: string;
  serverId?: string;
}

export interface DiscoverGuildsPayload {
  url: string;
}

export interface DiscoverGuildsResponse {
  guilds: GuildDiscovered[];
  htmlLength?: number;
}

export interface SystemStatsResponse {
  activeServers: number;
  totalServers: number;
  monitoredCharacters: number;
  onlineCharacters: number;
  antiBotStatus: string;
  antiBotChecks: number;
}
