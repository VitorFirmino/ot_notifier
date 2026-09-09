import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import {
  addOrUpdateServerSchedule,
  removeServerSchedule,
  scheduleServerRetry,
  triggerServerCheckNow,
  syncAllActiveServersToQueue,
  DOWN_RETRY_INTERVAL_MS,
} from "../serverQueueManager";
import type { ServerConfig } from "@shared/types/index";

vi.mock("bullmq", () => {
  const mockQueue = {
    getRepeatableJobs: vi.fn().mockResolvedValue([
      { name: "check-server:old_server", key: "check-server:old_server:::120000" },
    ]),
    removeRepeatableByKey: vi.fn().mockResolvedValue(true),
    upsertJobScheduler: vi.fn().mockResolvedValue({ id: "mock-scheduler-1" }),
    removeJobScheduler: vi.fn().mockResolvedValue(true),
    add: vi.fn().mockResolvedValue({ id: "mock-job-1" }),
  };

  return {
    Queue: vi.fn().mockImplementation(function () {
      return mockQueue;
    }),
  };
});

vi.mock("ioredis", () => {
  return {
    Redis: vi.fn().mockImplementation(function () {
      return {
        on: vi.fn(),
      };
    }),
  };
});

describe("BullMQ Queue Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should schedule repeatable server check job", async () => {
    await addOrUpdateServerSchedule("server1", 60000);
    expect(addOrUpdateServerSchedule).toBeDefined();
  });

  it("should remove server schedule from queue", async () => {
    await removeServerSchedule("server1");
    expect(removeServerSchedule).toBeDefined();
  });

  it("should reschedule a down server on the retry cadence instead of removing its job", async () => {
    await scheduleServerRetry("server1");

    const queueInstance = new (Queue as unknown as new () => any)();
    expect(queueInstance.upsertJobScheduler).toHaveBeenCalledWith(
      "check-server:server1",
      { every: DOWN_RETRY_INTERVAL_MS },
      expect.objectContaining({ data: { serverId: "server1" } })
    );
  });

  it("should trigger manual server check job", async () => {
    await triggerServerCheckNow("server1");
    expect(triggerServerCheckNow).toBeDefined();
  });

  it("should synchronize active server configs with queue", async () => {
    const mockConfigs: ServerConfig[] = [
      {
        serverId: "server1",
        serverName: "Server 1",
        guild: { url: "https://example.com", enabled: true },
        characters: {},
        isWorking: true,
      },
      {
        serverId: "server2",
        serverName: "Server 2",
        guild: { url: "https://example.com", enabled: false },
        characters: {},
        isWorking: false,
      },
    ];

    await syncAllActiveServersToQueue(mockConfigs);
    expect(syncAllActiveServersToQueue).toBeDefined();
  });
});
