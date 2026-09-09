import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from "vitest";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import * as lockfile from "proper-lockfile";
import {
  loadServerConfig,
  saveServerConfig,
  getAllServerConfigs,
  createServerConfig,
  updateServerCharacters,
  extractServerIdFromUrl,
  invalidateCache,
} from "../serverConfigManager";

import type { ServerConfig, GuildConfig } from "@shared/types/index";

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  };
});

vi.mock("proper-lockfile", () => ({
  lock: vi.fn(),
}));

const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedExistsSync = vi.mocked(existsSync);
const mockedReaddirSync = vi.mocked(readdirSync) as unknown as MockedFunction<
  (path: string) => string[]
>;
const mockedStatSync = vi.mocked(statSync);
const mockedLockfile = vi.mocked(lockfile);

describe("ServerConfigManager", () => {
  const mockServerId = "test-server";

  const mockConfig: ServerConfig = {
    serverId: "server1",
    serverName: "Server 1",
    guild: {
      url: "https://example.com/guilds/view/1",
      webhookUrl: "https://discord.com/api/webhooks/test",
      enabled: true,
    },
    characters: {
      SrGUSTAVO: {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
        up_streak: 5,
        last_milestone: 5,
      },
    },
    lastUpdate: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadFileSync.mockReset();
    mockedWriteFileSync.mockReset();
    mockedExistsSync.mockReset();
    mockedReaddirSync.mockReset();
    mockedStatSync.mockReset();
    mockedLockfile.lock.mockReset();
    mockedLockfile.lock.mockResolvedValue(async () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadServerConfig", () => {
    it("should load existing configuration", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = loadServerConfig(mockServerId);

      expect(result).toEqual(mockConfig);
      expect(mockedReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${mockServerId}.json`),
        "utf-8"
      );
    });

    it("should return null when file does not exist", () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(false);

      const result = loadServerConfig(mockServerId);

      expect(result).toBeNull();
      expect(mockedReadFileSync).not.toHaveBeenCalled();
    });

    it("should use cache when file was not modified", () => {
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));

      const first = loadServerConfig(mockServerId);
      const second = loadServerConfig(mockServerId);

      expect(first).toEqual(second);
      expect(mockedReadFileSync).toHaveBeenCalledTimes(1);
    });

    it("should invalidate cache when file was modified", () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync
        .mockReturnValueOnce({
          mtimeMs: 1000,
        } as ReturnType<typeof statSync>)
        .mockReturnValueOnce({
          mtimeMs: 2000,
        } as ReturnType<typeof statSync>);
      mockedReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockConfig))
        .mockReturnValueOnce(JSON.stringify({ ...mockConfig, serverName: "Updated" }));

      const first = loadServerConfig(mockServerId);
      const second = loadServerConfig(mockServerId);

      expect(first?.serverName).toBe("Server 1");
      expect(second?.serverName).toBe("Updated");
      expect(mockedReadFileSync).toHaveBeenCalledTimes(2);
    });

    it("should return null on parsing error", () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue("invalid json");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = loadServerConfig(mockServerId);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("saveServerConfig", () => {
    it("should save configuration with lock", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedLockfile.lock.mockResolvedValue(async () => {});

      await saveServerConfig(mockConfig);

      expect(mockedLockfile.lock).toHaveBeenCalled();
      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${mockConfig.serverId}.json`),
        expect.stringContaining(mockConfig.serverId),
        "utf-8"
      );
    });

    it("should create file if it does not exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      mockedLockfile.lock.mockResolvedValue(async () => {});

      await saveServerConfig(mockConfig);

      expect(mockedWriteFileSync).toHaveBeenCalled();
    });

    it("should add lastUpdate when saving", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedLockfile.lock.mockResolvedValue(async () => {});

      const configWithoutUpdate = { ...mockConfig };
      delete configWithoutUpdate.lastUpdate;

      await saveServerConfig(configWithoutUpdate);

      const savedContent = mockedWriteFileSync.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes(`${mockConfig.serverId}.json`)
      )?.[1] as string;

      expect(savedContent).toBeDefined();
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.lastUpdate).toBeDefined();
      expect(new Date(savedConfig.lastUpdate).getTime()).toBeCloseTo(Date.now(), -3);
    });

    it("should release lock after saving", async () => {
      let releaseFn: (() => Promise<void>) | null = null;
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedLockfile.lock.mockImplementation(async () => {
        releaseFn = async () => {};
        return releaseFn;
      });

      await saveServerConfig(mockConfig);

      expect(releaseFn).toBeDefined();
      expect(releaseFn).not.toBeNull();

      const release = releaseFn as unknown as () => Promise<void>;
      await expect(release()).resolves.not.toThrow();
    });
  });

  describe("getAllServerConfigs", () => {
    it("should return all server configurations", async () => {
      invalidateCache();
      mockedReaddirSync.mockReturnValue(["server1.json", "server2.json", "ntodark.json"]);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockImplementation((filePath) => {
        if (typeof filePath === "string" && filePath.includes("servers.json")) {
          return JSON.stringify([
            { id: "server1", url: "https://server1.example.com", name: "Server 1" },
            { id: "server2", url: "https://server2.example.com", name: "Server 2" },
            { id: "ntodark", url: "https://ntodark.example.com", name: "NTODark" },
          ]);
        }
        const match = typeof filePath === "string" && filePath.match(/([^/]+)\.json$/);
        const id = match ? match[1] : "server1";
        return JSON.stringify({ ...mockConfig, serverId: id });
      });

      const configs = await getAllServerConfigs();

      expect(configs).toHaveLength(3);
      expect(configs.map((config) => config.serverId)).toContain("server1");
      expect(configs.map((config) => config.serverId)).toContain("server2");
      expect(configs.map((config) => config.serverId)).toContain("ntodark");
    });

    it("should filter non-JSON files", async () => {
      invalidateCache();
      mockedReaddirSync.mockReturnValue(["server1.json", "readme.txt", "server2.json"]);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockImplementation((filePath) => {
        if (typeof filePath === "string" && filePath.includes("servers.json")) {
          return JSON.stringify([
            { id: "server1", url: "https://server1.example.com", name: "Server 1" },
            { id: "server2", url: "https://server2.example.com", name: "Server 2" },
          ]);
        }
        const match = typeof filePath === "string" && filePath.match(/([^/]+)\.json$/);
        const id = match ? match[1] : "server1";
        return JSON.stringify({ ...mockConfig, serverId: id });
      });

      const configs = await getAllServerConfigs();

      expect(configs).toHaveLength(2);
    });

  });

  describe("createServerConfig", () => {
    it("should create new server configuration", () => {
      const guildConfig: GuildConfig = {
        url: "https://mygame.example.com/guilds/view/1",
        webhookUrl: "https://discord.com/api/webhooks/new",
        enabled: true,
      };

      invalidateCache("mygame_example_com");
      mockedExistsSync.mockReturnValue(false);
      mockedLockfile.lock.mockResolvedValue(async () => {});

      const config = createServerConfig(guildConfig);

      expect(config.serverId).toBe("mygame_example_com");
      expect(config.guild).toEqual(guildConfig);
      expect(config.characters).toEqual({});
    });

    it("should return existing configuration if it exists", () => {
      const guildConfig: GuildConfig = {
        url: "https://example.com/guilds/view/1",
        webhookUrl: "https://discord.com/api/webhooks/test",
      };

      invalidateCache("server1");
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = createServerConfig(guildConfig);

      expect(config.serverId).toBe(mockConfig.serverId);
      expect(config.guild.url).toBe(mockConfig.guild.url);
    });
  });

  describe("updateServerCharacters", () => {
    it("should update server characters", async () => {
      const newCharacters = {
        SrGUSTAVO: {
          url: "https://example.com/character/view/SrGUSTAVO",
          last_level: 151,
          up_streak: 6,
        },
        TerrorZone: {
          url: "https://example.com/character/view/TerrorZone",
          last_level: 100,
          up_streak: 0,
        },
      };

      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
      mockedLockfile.lock.mockResolvedValue(async () => {});

      const result = await updateServerCharacters(mockServerId, newCharacters);

      expect(result).toBe(true);
      expect(mockedWriteFileSync).toHaveBeenCalled();
    });

    it("should return false when there are no changes", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = await updateServerCharacters(mockServerId, mockConfig.characters);

      expect(result).toBe(false);
      expect(mockedWriteFileSync).not.toHaveBeenCalled();
    });

    it("should return false when server does not exist", async () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await updateServerCharacters(mockServerId, {});

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("extractServerIdFromUrl", () => {
    it("should build serverId from the full hostname, not just the serverN label", () => {
      const url = "https://server1.example.com/guilds/view/1";
      const serverId = extractServerIdFromUrl(url);
      expect(serverId).toBe("server1_example_com");
      expect(extractServerIdFromUrl("https://server1.otherhost.com/guilds/view/1")).not.toBe(serverId);
    });

    it("should extract serverId from subdomain", () => {
      const url = "https://mygame.example.com/guilds/view/1";
      const serverId = extractServerIdFromUrl(url);
      expect(serverId).toBe("mygame_example_com");
    });

    it("should remove www. from hostname", () => {
      const url = "https://www.mygame.example.com/guilds/view/1";
      const serverId = extractServerIdFromUrl(url);
      expect(serverId).toBe("mygame_example_com");
    });

    it("should include OTDBO guild name in serverId", () => {
      const url = "https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=Morro+Do+Papel+Cagado";
      const serverId = extractServerIdFromUrl(url);
      expect(serverId).toBe("otdbo_morro_do_papel_cagado");
    });

    it("should return 'unknown' for invalid URL", () => {
      const url = "invalid-url";
      const serverId = extractServerIdFromUrl(url);
      expect(serverId).toBe("unknown");
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate cache for specific server", () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      loadServerConfig(mockServerId);
      invalidateCache(mockServerId);
      loadServerConfig(mockServerId);

      expect(mockedReadFileSync).toHaveBeenCalledTimes(2);
    });

    it("should invalidate all cache when serverId not provided", () => {
      invalidateCache(mockServerId);
      mockedExistsSync.mockReturnValue(true);
      mockedStatSync.mockReturnValue({
        mtimeMs: 1000,
      } as ReturnType<typeof statSync>);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      loadServerConfig(mockServerId);
      invalidateCache();
      loadServerConfig(mockServerId);

      expect(mockedReadFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
