import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDeath, isNewDeath } from "../deathHandler";
import { sendDeathWebhook } from "@infrastructure/webhooks/webhook";
import { recordCharacterEvent } from "@infrastructure/events/eventLog";
import type { DeathInfo } from "@shared/types/index";

vi.mock("@infrastructure/webhooks/webhook", () => ({
  sendDeathWebhook: vi.fn(),
}));

vi.mock("@infrastructure/events/eventLog", () => ({
  recordCharacterEvent: vi.fn().mockResolvedValue(undefined),
}));

const mockedSendDeathWebhook = vi.mocked(sendDeathWebhook);
const mockedRecordCharacterEvent = vi.mocked(recordCharacterEvent);

const SERVER_ID = "server1";
const SERVER_NAME = "Server 1";
const mockWebhookUrl = "https://discord.com/api/webhooks/test";

const death: DeathInfo = {
  level: 99,
  killers: ["Dragon", "Demon"],
  deathText: "Eliminado no nível 99 por Dragon e Demon",
  time: "2024-01-15 10:30:00",
};

describe("deathHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleDeath", () => {
    it("sends the death webhook and returns the updated last_death", async () => {
      mockedSendDeathWebhook.mockResolvedValueOnce(true);

      const result = await handleDeath({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "AAAzin",
        death,
      });

      expect(mockedSendDeathWebhook).toHaveBeenCalledWith({
        webhookUrl: mockWebhookUrl,
        name: "AAAzin",
        deathLevel: 99,
        killers: ["Dragon", "Demon"],
        deathText: death.deathText,
        time: death.time,
      });
      expect(result.last_death).toEqual(death);
    });

    it("records a death event with webhookSent reflecting the send result", async () => {
      mockedSendDeathWebhook.mockResolvedValueOnce(false);

      await handleDeath({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "AAAzin",
        death,
      });

      expect(mockedRecordCharacterEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: SERVER_ID,
          serverName: SERVER_NAME,
          type: "death",
          characterName: "AAAzin",
          level: 99,
          killers: ["Dragon", "Demon"],
          webhookSent: false,
        })
      );
    });

    it("still returns last_death and records the event when the webhook throws", async () => {
      mockedSendDeathWebhook.mockRejectedValueOnce(new Error("Webhook failed"));

      const result = await handleDeath({
        webhookUrl: mockWebhookUrl,
        serverId: SERVER_ID,
        serverName: SERVER_NAME,
        name: "AAAzin",
        death,
      });

      expect(result.last_death).toEqual(death);
      expect(mockedRecordCharacterEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "death", webhookSent: false })
      );
    });
  });

  describe("isNewDeath", () => {
    it("is false when there is no current death", () => {
      expect(isNewDeath(null, null)).toBe(false);
      expect(isNewDeath(death, null)).toBe(false);
    });

    it("is true when there was no previous death recorded", () => {
      expect(isNewDeath(null, death)).toBe(true);
      expect(isNewDeath(undefined, death)).toBe(true);
    });

    it("is false when the current death matches the previously recorded one", () => {
      expect(isNewDeath({ ...death }, { ...death })).toBe(false);
    });

    it("is true when level, killers, or time differ from the previous death", () => {
      expect(isNewDeath(death, { ...death, level: 100 })).toBe(true);
      expect(isNewDeath(death, { ...death, time: "2024-02-01 12:00:00" })).toBe(true);
      expect(
        isNewDeath(death, { ...death, deathText: "Eliminado no nível 99 por outro bicho" })
      ).toBe(true);
    });
  });
});
