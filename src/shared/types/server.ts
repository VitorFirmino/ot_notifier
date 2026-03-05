export interface ServerStatus {
  serverId: string;
  serverName: string;
  enabled: boolean;
  lastCheck?: Date;
  lastUpdate?: Date;
  characterCount: number;
  onlineCount: number;
  offlineCount: number;
  errorCount: number;
}

export interface ServerCheckResult {
  serverId: string;
  success: boolean;
  charactersProcessed: number;
  charactersUpdated: number;
  errors: number;
  duration: number;
  error?: string;
}
