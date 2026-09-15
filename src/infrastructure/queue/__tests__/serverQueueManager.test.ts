import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertJobScheduler = vi.fn();
const removeJobScheduler = vi.fn();
const queueAdd = vi.fn();

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(function QueueMock() {
    return { upsertJobScheduler, removeJobScheduler, add: queueAdd };
  }),
}));

vi.mock("../redisConnection", () => ({
  getRedisOptions: vi.fn().mockReturnValue({}),
}));

describe("serverQueueManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("does not hang forever when Redis never responds to upsertJobScheduler", async () => {
    vi.useFakeTimers();
    upsertJobScheduler.mockReturnValue(new Promise(() => {}));

    const { addOrUpdateServerSchedule } = await import("../serverQueueManager");
    const settled = addOrUpdateServerSchedule("server1", 120000);

    await vi.advanceTimersByTimeAsync(10000);
    await expect(settled).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it("does not hang forever when Redis never responds to removeJobScheduler", async () => {
    vi.useFakeTimers();
    removeJobScheduler.mockReturnValue(new Promise(() => {}));

    const { removeServerSchedule } = await import("../serverQueueManager");
    const settled = removeServerSchedule("server1");

    await vi.advanceTimersByTimeAsync(10000);
    await expect(settled).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it("does not hang forever when Redis never responds to queue.add", async () => {
    vi.useFakeTimers();
    queueAdd.mockReturnValue(new Promise(() => {}));

    const { triggerServerCheckNow } = await import("../serverQueueManager");
    const settled = triggerServerCheckNow("server1");

    await vi.advanceTimersByTimeAsync(10000);
    await expect(settled).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});
