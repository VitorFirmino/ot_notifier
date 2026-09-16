import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync } from "fs";

vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("@shared/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

import { logger } from "@shared/utils/logger";
import {
  writeHeartbeatFile,
  startHeartbeatFileLoop,
  recordJobActivity,
  startJobActivityWatchdog,
} from "../heartbeatManager";

const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedLoggerError = vi.mocked(logger.error);

describe("heartbeatManager", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    exitSpy.mockRestore();
  });

  describe("writeHeartbeatFile", () => {
    it("writes the current time to the heartbeat file", () => {
      writeHeartbeatFile();

      expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
      const [filePath, contents] = mockedWriteFileSync.mock.calls[0];
      expect(String(filePath)).toContain(".orchestrator-heartbeat");
      expect(new Date(contents as string).toString()).not.toBe("Invalid Date");
    });

    it("does not throw when the write fails", () => {
      mockedWriteFileSync.mockImplementationOnce(() => {
        throw new Error("disk full");
      });

      expect(() => writeHeartbeatFile()).not.toThrow();
    });
  });

  describe("startHeartbeatFileLoop", () => {
    it("writes immediately and then on every interval", () => {
      const timer = startHeartbeatFileLoop(1000);

      expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(3000);
      expect(mockedWriteFileSync).toHaveBeenCalledTimes(4);

      clearInterval(timer);
    });
  });

  describe("startJobActivityWatchdog", () => {
    it("does not exit while activity keeps being recorded before the threshold", () => {
      const timer = startJobActivityWatchdog(1000, 5000, () => true);

      vi.advanceTimersByTime(4000);
      recordJobActivity();
      vi.advanceTimersByTime(4000);
      recordJobActivity();
      vi.advanceTimersByTime(4000);

      expect(exitSpy).not.toHaveBeenCalled();
      clearInterval(timer);
    });

    it("exits the process once activity has been stale past the threshold", () => {
      const timer = startJobActivityWatchdog(1000, 5000, () => true);

      vi.advanceTimersByTime(6000);

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockedLoggerError).toHaveBeenCalled();
      clearInterval(timer);
    });

    it("never exits when there are no working servers to check", () => {
      const timer = startJobActivityWatchdog(1000, 5000, () => false);

      vi.advanceTimersByTime(60000);

      expect(exitSpy).not.toHaveBeenCalled();
      clearInterval(timer);
    });
  });
});
