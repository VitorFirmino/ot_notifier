import { describe, it, expect } from "vitest";
import { selectServersForLegacyFallback } from "../legacyFallbackPolicy";
import type { ServerConfig } from "@shared/types/index";

const buildServer = (serverId: string): ServerConfig => ({
  serverId,
  serverName: serverId,
  guild: { url: `https://example.com/?guild=${serverId}`, enabled: true },
  characters: {},
});

describe("selectServersForLegacyFallback", () => {
  it("starts every server when the count is at or below the cap", () => {
    const working = [buildServer("a"), buildServer("b")];

    const { toStart, skipped } = selectServersForLegacyFallback(working, 2);

    expect(toStart).toEqual(working);
    expect(skipped).toEqual([]);
  });

  it("caps the number of processes started and reports the rest as skipped", () => {
    const working = [buildServer("a"), buildServer("b"), buildServer("c"), buildServer("d")];

    const { toStart, skipped } = selectServersForLegacyFallback(working, 2);

    expect(toStart).toEqual([working[0], working[1]]);
    expect(skipped).toEqual([working[2], working[3]]);
  });

  it("defaults to MAX_LEGACY_PROCESSES when no cap is passed", () => {
    const working = Array.from({ length: 25 }, (_, index) => buildServer(`server-${index}`));

    const { toStart, skipped } = selectServersForLegacyFallback(working);

    expect(toStart).toHaveLength(20);
    expect(skipped).toHaveLength(5);
  });
});
