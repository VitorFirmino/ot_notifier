import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("solveCloudflareChallenge", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CAPSOLVER_API_KEY = "chave-de-teste";
    process.env.SCRAPING_PROXY_SERVER = "http://proxy.teste:3120";
    process.env.SCRAPING_PROXY_USERNAME = "usuario";
    process.env.SCRAPING_PROXY_PASSWORD = "senha";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CAPSOLVER_API_KEY;
    delete process.env.SCRAPING_PROXY_SERVER;
    delete process.env.SCRAPING_PROXY_USERNAME;
    delete process.env.SCRAPING_PROXY_PASSWORD;
  });

  it("para de chamar a API depois de três falhas seguidas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ errorId: 1, errorDescription: "ERROR_ZERO_BALANCE" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { solveCloudflareChallenge, isCapsolverPaused } = await import("../capsolverClient");

    expect(isCapsolverPaused()).toBe(false);

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(await solveCloudflareChallenge("https://ot.example/x", "sessao1")).toBeNull();
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(await solveCloudflareChallenge("https://ot.example/x", "sessao1")).toBeNull();
    expect(await solveCloudflareChallenge("https://ot.example/x", "sessao1")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("expõe o estado pausado para o painel sinalizar anti-bot sem contorno", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ errorId: 1, errorDescription: "ERROR_ZERO_BALANCE" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { solveCloudflareChallenge, isCapsolverPaused } = await import("../capsolverClient");

    expect(isCapsolverPaused()).toBe(false);

    for (let attempt = 0; attempt < 3; attempt++) {
      await solveCloudflareChallenge("https://ot.example/x", "sessao1");
    }

    expect(isCapsolverPaused()).toBe(true);
  });

  it("não chama a API quando a chave não está configurada", async () => {
    delete process.env.CAPSOLVER_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { solveCloudflareChallenge } = await import("../capsolverClient");

    expect(await solveCloudflareChallenge("https://ot.example/x", "sessao1")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
