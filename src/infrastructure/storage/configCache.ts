import { statSync } from "fs";
import type { Config } from "@shared/types/index";

type CacheEntry = {
  data: Config;
  timestamp: number;
  fileModifiedTime: number;
};

class ConfigCache {
  private cache: CacheEntry | null = null;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private getFileModifiedTime = (): number => {
    try {
      return statSync(this.filePath).mtimeMs;
    } catch (err: unknown) {
      return 0;
    }
  };

  private hasFileChanged = (): boolean => {
    if (!this.cache) return true;

    const currentModifiedTime = this.getFileModifiedTime();
    return currentModifiedTime !== this.cache.fileModifiedTime;
  };

  get = (): Config | null => {
    if (!this.cache) return null;

    if (this.hasFileChanged()) {
      console.log("📝 config.json modificado - recarregando do disco");
      this.invalidate();
      return null;
    }

    return this.cache.data;
  };

  set = (data: Config): void => {
    this.cache = {
      data,
      timestamp: Date.now(),
      fileModifiedTime: this.getFileModifiedTime(),
    };
  };

  invalidate = (): void => {
    this.cache = null;
  };

  getStats = () => {
    if (!this.cache) {
      return { cached: false, age: 0 };
    }

    return {
      cached: true,
      age: Date.now() - this.cache.timestamp,
      fileModifiedTime: new Date(this.cache.fileModifiedTime).toISOString(),
    };
  };
}

export const createConfigCache = (filePath: string): ConfigCache => {
  return new ConfigCache(filePath);
};
