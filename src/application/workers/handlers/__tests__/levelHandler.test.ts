import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleLevelUp,
  handleLevelDown,
  initializeFirstTimeCharacter,
  isFirstTimeCharacter,
} from "../levelHandler";
import { sendWebhook } from "@infrastructure/webhooks/webhook";
import type { CharacterInfo } from "@shared/types/index";

vi.mock("@infrastructure/webhooks/webhook", () => ({
  sendWebhook: vi.fn(),
}));

const mockedSendWebhook = vi.mocked(sendWebhook);

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
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6); // 5 + 1
    });

    it("should calculate streak correctly for multiple levels", async () => {
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
        name: "SrGUSTAVO",
        currentLevel: 155,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(155);
      expect(result.up_streak).toBe(10); // 5 + 5
    });

    it("should detect milestone when streak reaches threshold", async () => {
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      const characterWithStreak: CharacterInfo = {
        ...mockCharacter,
        up_streak: 2,
        last_milestone: 0,
      };

      const result = await handleLevelUp({
        webhookUrl: mockWebhookUrl,
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
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      await handleLevelUp({
        webhookUrl: mockWebhookUrl,
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
        name: "SrGUSTAVO",
        currentLevel: 151,
        lastLevel: 150,
        info: mockCharacter,
      });

      expect(result.last_level).toBe(151);
      expect(result.up_streak).toBe(6);
    });
  });

  describe("handleLevelDown", () => {
    const mockWebhookUrl = "https://discord.com/api/webhooks/test";

    it("should reset streak when leveling down", async () => {
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      const result = await handleLevelDown({
        webhookUrl: mockWebhookUrl,
        name: "TestChar",
        currentLevel: 99,
      });

      expect(result.last_level).toBe(99);
      expect(result.up_streak).toBe(0);
    });

    it("should send webhook when leveling down", async () => {
      mockedSendWebhook.mockResolvedValueOnce(undefined);

      await handleLevelDown({
        webhookUrl: mockWebhookUrl,
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
        name: "TestChar",
        currentLevel: 99,
      });

      expect(result.last_level).toBe(99);
      expect(result.up_streak).toBe(0);
    });
  });

  describe("initializeFirstTimeCharacter", () => {
    it("should initialize character for the first time", () => {
      const result = initializeFirstTimeCharacter(150);

      expect(result).toEqual({
        last_level: 150,
        up_streak: 0,
        last_milestone: 0,
      });
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
