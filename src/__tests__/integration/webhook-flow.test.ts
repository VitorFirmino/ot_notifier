import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleLevelUp, handleLevelDown } from "@application/workers/handlers/levelHandler";
import { processCharacterResults } from "@application/workers/handlers/characterProcessor";
import { sendWebhook } from "@infrastructure/webhooks/webhook";
import type { CharacterInfo, ProcessCharacterResult } from "@shared/types/index";

vi.mock("@infrastructure/webhooks/webhook", () => ({
  sendWebhook: vi.fn(),
  sendDeathWebhook: vi.fn().mockResolvedValue(true),
}));

vi.mock("@infrastructure/events/eventLog", () => ({
  recordEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockedSendWebhook = vi.mocked(sendWebhook);

const SERVER_ID = "server1";
const SERVER_NAME = "Server 1";

describe("Webhook Flow Integration", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/test";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSendWebhook.mockImplementation(async () => true);
  });

  describe("Level Up Flow", () => {
    it("should send webhook when character levels up", async () => {
      const character: CharacterInfo = {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
        up_streak: 5,
        last_milestone: 5,
      };

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: character,
      });

      expect(mockedSendWebhook).toHaveBeenCalled();
      const call = mockedSendWebhook.mock.calls[0][0];
      expect(call.webhookUrl).toBe(mockWebhookUrl);
      expect(call.name).toBe("SrGUSTAVO");
      expect(call.currentLevel).toBe(151);
      expect(call.status).toBe("up");
      expect(call.upStreak).toBe(6);
      expect(call.milestoneReached === undefined || typeof call.milestoneReached === "number").toBe(
        true
      );

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6);
    });

    it("should process character results and trigger webhooks", async () => {
      const characters: Record<string, CharacterInfo> = {
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
      };

      const results: ProcessCharacterResult[] = [
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

      const { stats } = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        results,
        characters,
      });

      expect(stats.levelChanged).toBe(1);
      expect(mockedSendWebhook).toHaveBeenCalledTimes(1);
      expect(mockedSendWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "SrGUSTAVO",
          currentLevel: 151,
          status: "up",
        })
      );
    });
  });

  describe("Level Down Flow", () => {
    it("should send webhook when character levels down", async () => {
      const result = await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "TerrorZone",
        currentLevel: 99,
      });

      expect(mockedSendWebhook).toHaveBeenCalledWith({
        webhookUrl: mockWebhookUrl,
        name: "TerrorZone",
        currentLevel: 99,
        status: "down",
        upStreak: 0,
        milestoneReached: 0,
      });

      expect(result.last_level).toBe(99);
      expect(result.up_streak).toBe(0);
    });

    it("should process level down in character results", async () => {
      const characters: Record<string, CharacterInfo> = {
        TerrorZone: {
          url: "https://example.com/character/view/TerrorZone",
          last_level: 100,
          up_streak: 10,
        },
      };

      const results: ProcessCharacterResult[] = [
        {
          name: "TerrorZone",
          level: 99, // desceu de 100 para 99
          isOnline: true,
          lastDeath: null,
        },
      ];

      const { stats } = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        results,
        characters,
      });

      expect(stats.levelChanged).toBe(1);
      expect(mockedSendWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "TerrorZone",
          currentLevel: 99,
          status: "down",
        })
      );
    });
  });

  describe("Multiple Characters Flow", () => {
    it("should process multiple characters and send webhooks for each level change", async () => {
      const characters: Record<string, CharacterInfo> = {
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
          last_level: 75,
          up_streak: 0,
        },
      };

      const results: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 151, // subiu
          isOnline: true,
          lastDeath: null,
        },
        {
          name: "TerrorZone",
          level: 100, // mesmo nível
          isOnline: true,
          lastDeath: null,
        },
        {
          name: "AAAz",
          level: 76, // subiu
          isOnline: true,
          lastDeath: null,
        },
      ];

      const { stats } = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        results,
        characters,
      });

      expect(stats.levelChanged).toBe(2);
      expect(mockedSendWebhook).toHaveBeenCalledTimes(2);
    });

    it("should not send webhook for offline characters", async () => {
      const characters: Record<string, CharacterInfo> = {
        SrGUSTAVO: {
          url: "https://example.com/character/view/SrGUSTAVO",
          last_level: 150,
          up_streak: 5,
        },
      };

      const results: ProcessCharacterResult[] = [
        {
          name: "SrGUSTAVO",
          level: 151,
          isOnline: false, // offline
          lastDeath: null,
        },
      ];

      const { stats } = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        results,
        characters,
      });

      expect(stats.levelChanged).toBe(0);
      expect(mockedSendWebhook).not.toHaveBeenCalled();
    });

    it("should not send webhook for first-time characters", async () => {
      const characters: Record<string, CharacterInfo> = {
        NewCharacter: {
          url: "https://example.com/character/view/NewCharacter",
          last_level: null, // primeira vez
        },
      };

      const results: ProcessCharacterResult[] = [
        {
          name: "NewCharacter",
          level: 50,
          isOnline: true,
          lastDeath: null,
        },
      ];

      const { stats } = await processCharacterResults({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        results,
        characters,
      });

      expect(stats.levelChanged).toBe(0);
      expect(mockedSendWebhook).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should continue processing even if webhook fails", async () => {
      mockedSendWebhook.mockRejectedValueOnce(new Error("Webhook failed"));

      const character: CharacterInfo = {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
        up_streak: 5,
      };

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: character,
      });

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6);
    });
  });
});
