import { describe, it, expect, vi, beforeEach } from "vitest";
import { processCharacterResults, fetchAndProcessCharacters } from "../characterProcessor";
import { processCharacters } from "@shared/utils/characterProcessor";
import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";

vi.mock("@shared/utils/characterProcessor", () => ({
  processCharacters: vi.fn(),
}));

vi.mock("@infrastructure/webhooks/webhook", () => ({
  sendWebhook: vi.fn().mockResolvedValue(undefined),
}));

const mockedProcessCharacters = vi.mocked(processCharacters);

describe("CharacterProcessor Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processCharacterResults", () => {
    const mockWebhookUrl = "https://discord.com/api/webhooks/test";
    const mockCharacters: Record<string, CharacterInfo> = {
      SrGUSTAVO: {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
        up_streak: 5,
      },
      TerrorZone: {
        url: "https://example.com/character/view/TerrorZone",
        last_level: 100,
        up_streak: 0,
      },
      AAAz: {
        url: "https://example.com/character/view/AAAz",
        last_level: null,
      },
    };

    it("should process results and update characters", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 151,
          isOnline: true,
          lastDeath: null,
        },
        {
          name: "TerrorZone",
          level: 100,
          isOnline: true,
          lastDeath: null,
        },
        {
          name: "AAAz",
          level: 75,
          isOnline: true,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.online).toBe(3);
      expect(result.stats.offline).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it("should count offline characters correctly", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 150,
          isOnline: false,
          lastDeath: null,
        },
        {
          name: "TerrorZone",
          level: null,
          isOnline: false,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.offline).toBe(2);
      expect(result.stats.online).toBe(0);
    });

    it("should count errors correctly", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: null,
          isOnline: false,
          lastDeath: null,
          error: "Network error",
        },
        {
          name: "TerrorZone",
          level: 100,
          isOnline: true,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.errors).toBe(1);
      expect(result.stats.online).toBe(1);
    });

    it("should count level changes", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 151, // subiu de 150 para 151
          isOnline: true,
          lastDeath: null,
        },
        {
          name: "TerrorZone",
          level: 100, // mesmo nível
          isOnline: true,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.levelChanged).toBe(1);
    });

    it("should not process offline characters", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 150,
          isOnline: false,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.levelChanged).toBe(0);
      expect(result.stats.offline).toBe(1);
    });

    it("should initialize first-time character even when offline if level is available", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "AAAz",
          level: 75,
          isOnline: false,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.updatedCharacters.AAAz?.last_level).toBe(75);
      expect(result.stats.offline).toBe(1);
      expect(result.stats.levelChanged).toBe(0);
    });

    it("should not process characters with error", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: null,
          isOnline: false,
          lastDeath: null,
          error: "Error",
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.errors).toBe(1);
      expect(result.stats.levelChanged).toBe(0);
    });

    it("should not process characters without level", async () => {
      const mockResults: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: null,
          isOnline: true,
          lastDeath: null,
        },
      ];

      const result = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        results: mockResults,
        characters: mockCharacters,
      });

      expect(result.stats.levelChanged).toBe(0);
      expect(result.stats.offline).toBe(1);
    });
  });

  describe("fetchAndProcessCharacters", () => {
    it("should call processCharacters with correct parameters", async () => {
      const mockCharacters: Record<string, CharacterInfo> = {
        Player1: {
          url: "https://test.example.com/character/Player1",
          last_level: 100,
        },
      };

      const mockResults: ProcessCharacterResult[] = [
        {
          name: "Player1",
          level: 100,
          isOnline: true,
          lastDeath: null,
        },
      ];

      mockedProcessCharacters.mockResolvedValueOnce({
        results: mockResults,
        stats: {
          total: 1,
          cached: 0,
          fetched: 1,
          errors: 0,
        },
      });

      const result = await fetchAndProcessCharacters(
        mockCharacters,
        1, // concurrency
        300, // requestDelay
        undefined, // customHeaders
        10 // batchSize
      );

      expect(mockedProcessCharacters).toHaveBeenCalledWith(
        mockCharacters,
        expect.objectContaining({
          concurrency: 1,
          requestDelay: 300,
          batchSize: 10,
          useCache: true,
          cacheTTL: 5 * 60 * 1000,
        })
      );

      expect(result.results).toEqual(mockResults);
      expect(result.stats.cached).toBe(0);
      expect(result.stats.fetched).toBe(1);
    });

    it("should pass custom headers", async () => {
      const mockCharacters: Record<string, CharacterInfo> = {
        Player1: {
          url: "https://test.example.com/character/Player1",
          last_level: 100,
        },
      };

      const customHeaders = {
        cookie: "cf_clearance=test",
        "user-agent": "TestBot",
      };

      mockedProcessCharacters.mockResolvedValueOnce({
        results: [],
        stats: {
          total: 1,
          cached: 0,
          fetched: 0,
          errors: 0,
        },
      });

      await fetchAndProcessCharacters(mockCharacters, 1, 300, customHeaders, 10);

      expect(mockedProcessCharacters).toHaveBeenCalledWith(
        mockCharacters,
        expect.objectContaining({
          customHeaders,
        })
      );
    });
  });
});
