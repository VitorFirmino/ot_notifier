import QuickLRU from "quick-lru";
import type { CharacterStatus } from "@shared/types/index";

const DEFAULT_MAX_SIZE = 5000;
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: CharacterStatus;
  timestamp: number;
  ttl: number;
}

class CharacterCache {
  private cache: QuickLRU<string, CacheEntry>;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.cache = new QuickLRU({ maxSize });
  }

  get(key: string): CharacterStatus | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: CharacterStatus, ttl: number = DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  setTTL(ttl: number): void {
    const entries = Array.from(this.cache.entries());
    this.cache.clear();

    entries.forEach(([key, entry]) => {
      this.cache.set(key, {
        ...entry,
        ttl,
      });
    });
  }
}

export const characterCache = new CharacterCache(DEFAULT_MAX_SIZE);
