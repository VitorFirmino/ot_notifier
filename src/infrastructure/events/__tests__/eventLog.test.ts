import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActivityEvent } from "@shared/types/index";
import { recordEvent, getRecentEvents, EVENTS_KEY, MAX_EVENTS } from "../eventLog";

const mockRedis = {
  lpush: vi.fn().mockResolvedValue(1),
  ltrim: vi.fn().mockResolvedValue("OK"),
  lrange: vi.fn().mockResolvedValue([]),
  on: vi.fn(),
};

vi.mock("ioredis", () => ({
  Redis: vi.fn().mockImplementation(function () {
    return mockRedis;
  }),
}));

const sampleEvent: ActivityEvent = {
  id: "evt-1",
  timestamp: "2026-09-06T00:00:00.000Z",
  serverId: "server1",
  serverName: "Server 1",
  type: "level_up",
  characterName: "SrGUSTAVO",
  level: 151,
  previousLevel: 150,
  webhookSent: true,
};

describe("eventLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushes a new event and trims the list to the retention cap", async () => {
    await recordEvent(sampleEvent);

    expect(mockRedis.lpush).toHaveBeenCalledWith(EVENTS_KEY, JSON.stringify(sampleEvent));
    expect(mockRedis.ltrim).toHaveBeenCalledWith(EVENTS_KEY, 0, MAX_EVENTS - 1);
  });

  it("never throws when Redis is unavailable", async () => {
    mockRedis.lpush.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(recordEvent(sampleEvent)).resolves.toBeUndefined();
  });

  it("returns the most recent events parsed from Redis", async () => {
    mockRedis.lrange.mockResolvedValueOnce([JSON.stringify(sampleEvent)]);

    const events = await getRecentEvents(50);

    expect(mockRedis.lrange).toHaveBeenCalledWith(EVENTS_KEY, 0, 49);
    expect(events).toEqual([sampleEvent]);
  });

  it("returns an empty list instead of throwing when Redis is unavailable", async () => {
    mockRedis.lrange.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(getRecentEvents()).resolves.toEqual([]);
  });

  it("skips any entry that isn't valid JSON instead of throwing", async () => {
    mockRedis.lrange.mockResolvedValueOnce(["not json", JSON.stringify(sampleEvent)]);

    const events = await getRecentEvents();

    expect(events).toEqual([sampleEvent]);
  });
});
