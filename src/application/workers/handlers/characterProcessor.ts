import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";
import { processCharacters } from "@shared/utils/characterProcessor";
import {
  handleLevelUp,
  handleLevelDown,
  initializeFirstTimeCharacter,
  isFirstTimeCharacter,
} from "./levelHandler";

interface ProcessCharacterParams {
  webhookUrl: string;
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
  const { webhookUrl, characters } = params;
  const { name, level, isOnline, error } = result;
  const info = characters[name];

  if (!info) return { updated: false };
  if (error) return { updated: false };
  if (level === null) return { updated: false };

  if (isFirstTimeCharacter(info)) {
    const updates = initializeFirstTimeCharacter(level);
    return {
      updated: true,
      character: {
        ...info,
        ...updates,
      },
    };
  }

  if (!isOnline) return { updated: false };

  const { last_level } = info;
  if (last_level === null || level === last_level) {
    return { updated: false };
  }

  if (level > last_level) {
    try {
      const updatedCharacter = await handleLevelUp({
        webhookUrl,
        name,
        currentLevel: level,
        lastLevel: last_level,
        info,
      });
      return {
        updated: true,
        character: updatedCharacter,
      };
    } catch {
      return { updated: false };
    }
  }

  try {
    const updates = await handleLevelDown({
      webhookUrl,
      name,
      currentLevel: level,
    });
    return {
      updated: true,
      character: {
        ...info,
        ...updates,
      },
    };
  } catch {
    return { updated: false };
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
        if (info && info.last_level !== null) {
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
