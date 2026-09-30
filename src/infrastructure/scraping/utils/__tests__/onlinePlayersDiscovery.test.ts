import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ServerConfig } from "@shared/types/index";

const fetchWithAxiosResult = vi.fn();
const loadServerConfig = vi.fn();
const saveServerConfig = vi.fn();

vi.mock("../../http/axiosClient", () => ({
  createRequestHeaders: vi.fn(() => ({})),
  fetchWithAxiosResult,
}));

vi.mock("@infrastructure/storage/serverConfigManager", () => ({
  loadServerConfig,
  saveServerConfig,
}));

vi.mock("../../playwrightManager", () => ({
  playwrightManager: { fetchPageContent: vi.fn() },
}));

const onlineHtml = `<a href="?subtopic=characters&name=Frodo">Frodo</a>`;

const buildConfig = (overrides: Partial<ServerConfig> = {}): ServerConfig => ({
  serverId: "example_com",
  serverName: "Example",
  guild: { url: "https://example.com/guilds/1", enabled: true },
  characters: {},
  ...overrides,
});

describe("fetchOnlineCharacterNames — remembering which path works", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveServerConfig.mockResolvedValue(undefined);
  });

  it("tries the default order and remembers whichever path succeeds", async () => {
    loadServerConfig.mockReturnValue(buildConfig());
    fetchWithAxiosResult.mockImplementation((url: string) => {
      if (url === "https://example.com/online") {
        return Promise.resolve({ html: onlineHtml, statusCode: 200 });
      }
      return Promise.resolve({ html: null, statusCode: 403 });
    });

    const { fetchOnlineCharacterNames } = await import("../onlinePlayersDiscovery");
    const names = await fetchOnlineCharacterNames("https://example.com/guilds/1");

    expect(names).toEqual(new Set(["Frodo"]));
    expect(saveServerConfig).toHaveBeenCalledWith(expect.objectContaining({ lastWorkingOnlineListPath: "/online" }));
  });

  it("tries the remembered path first instead of the default order", async () => {
    loadServerConfig.mockReturnValue(buildConfig({ lastWorkingOnlineListPath: "/online" }));
    fetchWithAxiosResult.mockImplementation((url: string) => {
      if (url === "https://example.com/online") {
        return Promise.resolve({ html: onlineHtml, statusCode: 200 });
      }
      return Promise.resolve({ html: null, statusCode: 403 });
    });

    const { fetchOnlineCharacterNames } = await import("../onlinePlayersDiscovery");
    const names = await fetchOnlineCharacterNames("https://example.com/guilds/1");

    expect(names).toEqual(new Set(["Frodo"]));
    expect(fetchWithAxiosResult).toHaveBeenCalledTimes(1);
    expect(saveServerConfig).not.toHaveBeenCalled();
  });
});
