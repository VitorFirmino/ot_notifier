import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("Webhook Integration - Real Flow", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/real-test";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSendWebhook.mockResolvedValue(true);
  });

  it("should send webhook when SrGUSTAVO levels up from 150 to 151", async () => {
    const characters: Record<string, CharacterInfo> = {
      SrGUSTAVO: {
        url: "https://example.com/character/view/SrGUSTAVO",
        last_level: 150,
        up_streak: 5,
        last_milestone: 5,
      },
    };

    const results: ProcessCharacterResult[] = [
      {
        name: "SrGUSTAVO",
        level: 151,
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
    expect(mockedSendWebhook).toHaveBeenCalled();
    const call = mockedSendWebhook.mock.calls[0][0];
    expect(call.webhookUrl).toBe(mockWebhookUrl);
    expect(call.name).toBe("SrGUSTAVO");
    expect(call.currentLevel).toBe(151);
    expect(call.status).toBe("up");
    expect(call.upStreak).toBe(6);
    expect(call.milestoneReached === undefined || typeof call.milestoneReached === "number").toBe(true);
  });

  it("should send webhook when TerrorZone levels down from 100 to 99", async () => {
    const characters: Record<string, CharacterInfo> = {
      TerrorZone: {
        url: "https://example.com/character/view/TerrorZone",
        last_level: 100,
        up_streak: 10,
        last_milestone: 10,
      },
    };

    const results: ProcessCharacterResult[] = [
      {
        name: "TerrorZone",
        level: 99,
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
    expect(mockedSendWebhook).toHaveBeenCalledWith({
      webhookUrl: mockWebhookUrl,
      name: "TerrorZone",
      currentLevel: 99,
      status: "down",
      upStreak: 0,
      milestoneReached: 0,
    });
  });

  it("should not send webhook when level does not change", async () => {
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
        level: 150, // mesmo nível
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

  it("should process multiple characters and send webhooks for each change", async () => {
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
    
    const webhookCalls = mockedSendWebhook.mock.calls;
    const namesCalled = webhookCalls.map((call) => call[0].name);
    expect(namesCalled).toContain("SrGUSTAVO");
    expect(namesCalled).toContain("AAAz");
    expect(namesCalled).not.toContain("TerrorZone");
  });
});

