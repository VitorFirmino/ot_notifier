import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import { sendWebhook, sendGuildSyncWebhook, sendDeathWebhook } from "../webhook";
import { webhookRateLimiter } from "@shared/utils/webhookRateLimiter";
import { retryWithBackoff } from "@shared/utils/retry";

vi.mock("axios");
const mockedAxiosPost = vi.mocked(axios.post);

vi.mock("@shared/utils/webhookRateLimiter", () => ({
  webhookRateLimiter: {
    execute: vi.fn((fn) => fn()),
  },
}));

vi.mock("@shared/utils/retry", () => ({
  retryWithBackoff: vi.fn((fn) => fn()),
}));

const mockedWebhookRateLimiter = vi.mocked(webhookRateLimiter);
const mockedRetryWithBackoff = vi.mocked(retryWithBackoff);

describe("Webhook - sendWebhook", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/test";
  const mockParams = {
    webhookUrl: mockWebhookUrl,
    name: "SrGUSTAVO",
    currentLevel: 150,
    status: "up" as const,
    upStreak: 5,
    milestoneReached: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedWebhookRateLimiter.execute.mockImplementation(async (fn) => fn());
    mockedRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send level up webhook successfully", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook(mockParams);

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        content: expect.stringContaining("SrGUSTAVO"),
      }),
      expect.any(Object)
    );
  });

  it("should include milestone message when reached", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook({
      ...mockParams,
      milestoneReached: 5,
    });

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("SrGUSTAVO");
    expect(content).toContain("150");
  });

  it("should send level down webhook", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook({
      ...mockParams,
      currentLevel: 149,
      status: "down",
      upStreak: 0,
      milestoneReached: 0,
    });

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("perdeu um nível");
    expect(content).toContain("149");
  });

  it("should use rate limiter", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook(mockParams);

    expect(mockedWebhookRateLimiter.execute).toHaveBeenCalled();
  });

  it("should use retry with backoff on error", async () => {
    const error = new Error("Network error");
    mockedRetryWithBackoff.mockRejectedValueOnce(error);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendWebhook(mockParams);

    expect(mockedRetryWithBackoff).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Erro ao enviar webhook"));

    consoleSpy.mockRestore();
  });

  it("should handle rate limit (429)", async () => {
    const rateLimitError = new AxiosError("Rate limited");
    rateLimitError.response = {
      status: 429,
      headers: {
        "retry-after": "5",
      },
    } as unknown as AxiosError["response"];

    mockedRetryWithBackoff.mockRejectedValueOnce(rateLimitError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendWebhook(mockParams);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Erro ao enviar webhook"));

    consoleErrorSpy.mockRestore();
  });

  it("should resolve to true when the webhook is sent successfully", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await expect(sendWebhook(mockParams)).resolves.toBe(true);
  });

  it("should resolve to false when sending ultimately fails", async () => {
    mockedRetryWithBackoff.mockRejectedValueOnce(new Error("Network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendWebhook(mockParams)).resolves.toBe(false);
  });
});

describe("Webhook - sendGuildSyncWebhook", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/test";
  const mockParams = {
    webhookUrl: mockWebhookUrl,
    newMembers: ["SrGUSTAVO", "TerrorZone", "AAAz"],
    totalMembers: 4400,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedWebhookRateLimiter.execute.mockImplementation(async (fn) => fn());
    mockedRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  it("should send guild sync webhook", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendGuildSyncWebhook(mockParams);

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        content: expect.stringContaining("Nova sincronização"),
      }),
      expect.any(Object)
    );
  });

  it("should include list of new members", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendGuildSyncWebhook(mockParams);

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("SrGUSTAVO");
    expect(content).toContain("TerrorZone");
    expect(content).toContain("AAAz");
    expect(content).toContain("4400");
  });

  it("should limit list to 10 members", async () => {
    const manyMembers = Array.from({ length: 15 }, (_, index) => `Player${index + 1}`);
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendGuildSyncWebhook({
      ...mockParams,
      newMembers: manyMembers,
    });

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("e mais 5 membro(s)");
  });

  it("should not send webhook when there are no new members", async () => {
    await sendGuildSyncWebhook({
      ...mockParams,
      newMembers: [],
    });

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });
});

describe("Webhook - sendDeathWebhook", () => {
  const mockWebhookUrl = "https://discord.com/api/webhooks/test";
  const mockParams = {
    webhookUrl: mockWebhookUrl,
    name: "AAAzin",
    deathLevel: 99,
    killers: ["Dragon", "Demon"],
    deathText: "Eliminado no nível 99 por Dragon e Demon",
    time: "2024-01-15 10:30:00",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedWebhookRateLimiter.execute.mockImplementation(async (fn) => fn());
    mockedRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  it("should send death webhook", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendDeathWebhook(mockParams);

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        content: expect.stringContaining("AAAzin"),
      }),
      expect.any(Object)
    );
  });

  it("should include death information", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendDeathWebhook(mockParams);

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("AAAzin");
    expect(content).toContain("99");
    expect(content).toContain("Dragon");
    expect(content).toContain("Demon");
    expect(content).toContain("2024-01-15 10:30:00");
  });

  it("should handle unknown killers", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendDeathWebhook({
      ...mockParams,
      killers: [],
    });

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).toContain("Desconhecido");
  });

  it("should handle death without time", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await sendDeathWebhook({
      ...mockParams,
      time: undefined,
    });

    const callArgs = mockedAxiosPost.mock.calls[0];
    const content = (callArgs?.[1] as { content?: string })?.content as string;

    expect(content).not.toContain("🕐");
  });

  it("should resolve to true when the death webhook is sent successfully", async () => {
    mockedAxiosPost.mockResolvedValueOnce({ status: 200 });

    await expect(sendDeathWebhook(mockParams)).resolves.toBe(true);
  });

  it("should resolve to false when sending ultimately fails", async () => {
    mockedRetryWithBackoff.mockRejectedValueOnce(new Error("Network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendDeathWebhook(mockParams)).resolves.toBe(false);
  });
});
