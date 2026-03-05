export interface CharacterStatus {
  name: string;
  server: string;
  online: boolean;
  level: number;
  url: string;
  lastLevel?: number;
  upStreak?: number;
  lastMilestone?: number;
  lastDeath?: CharacterDeath;
}

export interface CharacterDeath {
  level: number;
  killers: string[];
  deathText: string;
  time: string;
}

export interface CharacterInfo {
  url: string;
  last_level?: number;
  up_streak?: number;
  last_milestone?: number;
  last_death?: CharacterDeath;
}

export interface ProcessCharacterResult {
  name: string;
  success: boolean;
  status?: CharacterStatus;
  error?: string;
  cached?: boolean;
}

export interface ProcessStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  cached: number;
  errors: number;
  online: number;
  offline: number;
  levelChanges: number;
}
