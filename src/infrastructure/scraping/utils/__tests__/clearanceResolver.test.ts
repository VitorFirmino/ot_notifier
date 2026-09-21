import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  solveCloudflareChallenge: vi.fn(),
  getCachedClearance: vi.fn(),
  saveClearance: vi.fn(),
  invalidateClearance: vi.fn(),
}));

vi.mock("../capsolverClient", () => ({
  solveCloudflareChallenge: mocks.solveCloudflareChallenge,
}));

vi.mock("../clearanceCache", () => ({
  getCachedClearance: mocks.getCachedClearance,
  saveClearance: mocks.saveClearance,
  invalidateClearance: mocks.invalidateClearance,
}));

const { resolveClearance } = await import("../clearanceResolver");

describe("resolveClearance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("paga um único solve quando várias navegações do mesmo domínio são desafiadas juntas", async () => {
    mocks.getCachedClearance.mockResolvedValue(null);
    mocks.solveCloudflareChallenge.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { cfClearance: "novo", userAgent: "UA" };
    });

    const resultados = await Promise.all([
      resolveClearance("ot.example", "https://ot.example/a", "sessao1", null),
      resolveClearance("ot.example", "https://ot.example/b", "sessao1", null),
      resolveClearance("ot.example", "https://ot.example/c", "sessao1", null),
    ]);

    expect(mocks.solveCloudflareChallenge).toHaveBeenCalledTimes(1);
    expect(resultados.map((item) => item?.cfClearance)).toEqual(["novo", "novo", "novo"]);
  });

  it("reaproveita o clearance que outra navegação acabou de gravar", async () => {
    mocks.getCachedClearance.mockResolvedValue({
      cfClearance: "recem-gravado",
      userAgent: "UA",
      proxySessionId: "sessao1",
      exitIp: null,
      solvedAt: Date.now(),
    });

    const resultado = await resolveClearance("ot.example", "https://ot.example/a", "sessao1", "antigo");

    expect(mocks.solveCloudflareChallenge).not.toHaveBeenCalled();
    expect(mocks.invalidateClearance).not.toHaveBeenCalled();
    expect(resultado?.cfClearance).toBe("recem-gravado");
  });

  it("resolve de novo quando o clearance em cache é o mesmo que já falhou", async () => {
    mocks.getCachedClearance.mockResolvedValue({
      cfClearance: "vencido",
      userAgent: "UA",
      proxySessionId: "sessao1",
      exitIp: null,
      solvedAt: Date.now(),
    });
    mocks.solveCloudflareChallenge.mockResolvedValue({ cfClearance: "novo", userAgent: "UA" });

    const resultado = await resolveClearance("ot.example", "https://ot.example/a", "sessao1", "vencido");

    expect(mocks.invalidateClearance).toHaveBeenCalledWith("ot.example");
    expect(mocks.solveCloudflareChallenge).toHaveBeenCalledTimes(1);
    expect(resultado?.cfClearance).toBe("novo");
  });
});
