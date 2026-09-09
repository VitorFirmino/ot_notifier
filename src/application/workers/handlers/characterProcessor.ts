import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";
import { processCharacters } from "@shared/utils/characterProcessor";
import {
  handleLevelUp,
  handleLevelDown,
  initializeFirstTimeCharacter,
  isFirstTimeCharacter,
} from "./levelHandler";
import { handleDeath, isNewDeath } from "./deathHandler";

interface ProcessCharacterParams {
  webhookUrl: string;
  serverId: string;
  serverName: string;
  results: ProcessCharacterResult[];
  characters: Record<string, CharacterInfo>;
}

interface ProcessStats {
  online: number;
  offline: number;
  errors: number;
  levelChanged: number;
}

interface ProcessSingleCharacterResult {
  updated: boolean;
  character?: CharacterInfo;
}

const processSingleCharacter = async (
  result: ProcessCharacterResult,
  params: ProcessCharacterParams
): Promise<ProcessSingleCharacterResult> => {
  const { webhookUrl, serverId, serverName, characters } = params;
  const { name, level, isOnline, error, lastDeath } = result;
  const info = characters[name];

  if (!info) return { updated: false };
  if (error) return { updated: false };
  if (level === null) return { updated: false };

  const withOnlineStatus = (character: CharacterInfo): CharacterInfo => ({ ...character, isOnline });

  if (isFirstTimeCharacter(info)) {
    const updates = initializeFirstTimeCharacter(level, lastDeath);
    return {
      updated: true,
      character: withOnlineStatus({
        ...info,
        ...updates,
      }),
    };
  }

  let deathUpdate: Partial<CharacterInfo> | undefined;
  if (isNewDeath(info.last_death, lastDeath)) {
    try {
      deathUpdate = await handleDeath({ webhookUrl, serverId, serverName, name, death: lastDeath });
    } catch (err: unknown) {
      console.warn(`Error handling death for ${name}:`, err);
    }
  }

  const withDeath = (character: CharacterInfo): ProcessSingleCharacterResult => ({
    updated: true,
    character: withOnlineStatus(deathUpdate ? { ...character, ...deathUpdate } : character),
  });
  const deathOnlyOrSkip = (): ProcessSingleCharacterResult => withDeath(info);

  if (!isOnline) return deathOnlyOrSkip();

  const { last_level } = info;
  if (last_level === null || level === last_level) {
    return deathOnlyOrSkip();
  }

  if (level > last_level) {
    try {
      const updatedCharacter = await handleLevelUp({
        webhookUrl,
        serverId,
        serverName,
        name,
        currentLevel: level,
        lastLevel: last_level,
        info,
      });
      return withDeath(updatedCharacter);
    } catch (err: unknown) {
      console.warn(`Error handling level up for ${name}:`, err);
      return deathOnlyOrSkip();
    }
  }

  try {
    const updates = await handleLevelDown({
      webhookUrl,
      serverId,
      serverName,
      name,
      currentLevel: level,
    });
    return withDeath({ ...info, ...updates });
  } catch (err: unknown) {
    console.warn(`Error handling level down for ${name}:`, err);
    return deathOnlyOrSkip();
  }
};

export const processCharacterResults = async (
  params: ProcessCharacterParams
): Promise<{
  updatedCharacters: Record<string, CharacterInfo>;
  stats: ProcessStats;
}> => {
  const { results, characters } = params;
  const stats: ProcessStats = {
    online: 0,
    offline: 0,
    errors: 0,
    levelChanged: 0,
  };

  const updatedCharactersMap = new Map<string, CharacterInfo>(Object.entries(characters));

  await Promise.all(
    results.map(async (result) => {
      const { name, isOnline, error, level } = result;

      if (error) {
        stats.errors++;
        return;
      }

      if (level === null) {
        stats.offline++;
        return;
      }

      if (!isOnline) {
        stats.offline++;
      } else {
        stats.online++;
      }

      const processed = await processSingleCharacter(result, params);

      if (processed.updated && processed.character) {
        const info = characters[name];
        if (info && info.last_level !== null && processed.character.last_level !== info.last_level) {
          stats.levelChanged++;
        }
        updatedCharactersMap.set(name, processed.character);
      }
    })
  );

  const updatedCharacters = Object.fromEntries(updatedCharactersMap);

  return {
    updatedCharacters,
    stats,
  };
};

export const fetchAndProcessCharacters = async (
  characters: Record<string, CharacterInfo>,
  concurrency: number,
  requestDelay: number,
  customHeaders?: Record<string, string>,
  batchSize?: number,
  serverId?: string
): Promise<{
  results: ProcessCharacterResult[];
  stats: { cached: number; fetched: number };
}> => {
  const processResult = await processCharacters(characters, {
    concurrency,
    useCache: true,
    cacheTTL: 5 * 60 * 1000,
    silentRetries: true,
    requestDelay,
    customHeaders,
    batchSize,
    serverId,
  });

  return {
    results: processResult.results,
    stats: processResult.stats,
  };
};

export const fetchAndProcessCharactersWithProgress = async (
  characters: Record<string, CharacterInfo>,
  concurrency: number,
  requestDelay: number,
  customHeaders?: Record<string, string>,
  batchSize?: number,
  serverId?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  results: ProcessCharacterResult[];
  stats: { cached: number; fetched: number };
}> => {
  const processResult = await processCharacters(characters, {
    concurrency,
    useCache: true,
    cacheTTL: 5 * 60 * 1000,
    silentRetries: true,
    requestDelay,
    customHeaders,
    batchSize,
    serverId,
    onProgress,
  });

  return {
    results: processResult.results,
    stats: processResult.stats,
  };
};
