import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleLevelUp,
  handleLevelDown,
  initializeFirstTimeCharacter,
  isFirstTimeCharacter,
} from "../levelHandler";
import { sendWebhook } from "@infrastructure/webhooks/webhook";
import { recordEvent } from "@infrastructure/events/eventLog";
import type { CharacterInfo } from "@shared/types/index";

vi.mock("@infrastructure/webhooks/webhook", () => ({
  sendWebhook: vi.fn(),
}));

vi.mock("@infrastructure/events/eventLog", () => ({
  recordEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockedSendWebhook = vi.mocked(sendWebhook);
const mockedRecordEvent = vi.mocked(recordEvent);

const SERVER_ID = "server1";
const SERVER_NAME = "Server 1";

describe("LevelHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleLevelUp", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/test";
  const mockCharacter: CharacterInfo = {
    url: "https://example.com/character/view/SrGUSTAVO",
    last_level: 150,
    up_streak: 5,
    last_milestone: 5,
  };

    it("should update streak when leveling up", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6); // 5 + 1
    });

    it("should calculate streak correctly for multiple levels", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 155,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(155);
      expect(result.up_streak).toBe(10); // 5 + 5
    });

    it("should detect milestone when streak reaches threshold", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      const characterWithStreak: CharacterInfo = {
        ...mockCharacter,
        up_streak: 2,
        last_milestone: 0,
      };

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: characterWithStreak,
      });

      expect(result.last_milestone).toBeGreaterThan(0);
      expect(mockedSendWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneReached: expect.any(Number),
        })
      );
    });

    it("should send webhook when leveling up", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(mockedSendWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookUrl: mockWebhookUrl,
          name: "SrGUSTAVO",
          currentLevel: 151,
          status: "up",
          upStreak: 6,
        })
      );
    });

    it("should update character even if webhook fails", async () => {
      mockedSendWebhook.mockRejectedValueOnce(new Error("Webhook failed"));

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6);
    });

    it("should record a level_up event with webhookSent true on success", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(mockedRecordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: SERVER_ID,
          serverName: SERVER_NAME,
          type: "level_up",
          characterName: "SrGUSTAVO",
          level: 151,
          previousLevel: 150,
          webhookSent: true,
        })
      );
    });

    it("should record a level_up event with webhookSent false when the webhook fails", async () => {
      mockedSendWebhook.mockResolvedValueOnce(false);

      await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(mockedRecordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ webhookSent: false })
      );
    });

    it("should still record the event when sendWebhook throws unexpectedly", async () => {
      mockedSendWebhook.mockRejectedValueOnce(new Error("Webhook failed"));

      await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(mockedRecordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "level_up", webhookSent: false })
      );
    });
  });

  describe("handleLevelDown", () => {
    const mockWebhookUrl = "https://discord.com/api/webhooks/test";

    it("should reset streak when leveling down", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      const result = await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "TestChar",
        currentLevel: 99,
      });

      expect(result.last_level).toBe(99);
      expect(result.up_streak).toBe(0);
    });

    it("should send webhook when leveling down", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "TerrorZone",
        currentLevel: 149,
      });

      expect(mockedSendWebhook).toHaveBeenCalledWith({
        webhookUrl: mockWebhookUrl,
        name: "TerrorZone",
        currentLevel: 149,
        status: "down",
        upStreak: 0,
        milestoneReached: 0,
      });
    });

    it("should return updates even if webhook fails", async () => {
      mockedSendWebhook.mockRejectedValueOnce(new Error("Webhook failed"));

      const result = await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "TestChar",
        currentLevel: 99,
      });

      expect(result.last_level).toBe(99);
      expect(result.up_streak).toBe(0);
    });

    it("should record a level_down event with webhookSent reflecting the send result", async () => {
      mockedSendWebhook.mockResolvedValueOnce(true);

      await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "TerrorZone",
        currentLevel: 149,
      });

      expect(mockedRecordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: SERVER_ID,
          serverName: SERVER_NAME,
          type: "level_down",
          characterName: "TerrorZone",
          level: 149,
          webhookSent: true,
        })
      );
    });
  });

  describe("initializeFirstTimeCharacter", () => {
    it("should initialize character for the first time", () => {
      const result = initializeFirstTimeCharacter(150);

      expect(result).toEqual({
        last_level: 150,
        up_streak: 0,
        last_milestone: 0,
        last_death: null,
      });
    });

    it("should baseline an existing death without treating it as new", () => {
      const death = { level: 40, killers: ["Rat"], deathText: "Eliminado no nível 40 por Rat" };

      const result = initializeFirstTimeCharacter(150, death);

      expect(result.last_death).toEqual(death);
    });

    it("should work with any level", () => {
      const result = initializeFirstTimeCharacter(50);

      expect(result.last_level).toBe(50);
    });
  });

  describe("isFirstTimeCharacter", () => {
    it("should return true when last_level is null", () => {
      const character: CharacterInfo = {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: null,
      };

      expect(isFirstTimeCharacter(character)).toBe(true);
    });

    it("should return false when last_level exists", () => {
      const character: CharacterInfo = {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
      };

      expect(isFirstTimeCharacter(character)).toBe(false);
    });
  });
});
