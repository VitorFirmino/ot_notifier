import { describe, it, expect, vi, beforeEach } from "vitest";
import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { assertPublicHttpUrl, UnsafeUrlError } from "../urlSafety";

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn() },
}));

const mockedLookup = vi.mocked(
  dns.lookup as unknown as (
    hostname: string,
    options: { all: true; verbatim?: boolean }
  ) => Promise<LookupAddress[]>
);

describe("assertPublicHttpUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-http(s) schemes", async () => {
    await expect(assertPublicHttpUrl("ftp://example.com/file")).rejects.toThrow(UnsafeUrlError);
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects a malformed URL", async () => {
    await expect(assertPublicHttpUrl("not a url")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects a literal loopback IP", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1/admin")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects a literal cloud-metadata link-local IP", async () => {
    await expect(
      assertPublicHttpUrl("http://169.254.169.254/latest/meta-data/")
    ).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects a literal RFC1918 private IP", async () => {
    await expect(assertPublicHttpUrl("http://192.168.1.1/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects a hostname that resolves to a private IP", async () => {
    mockedLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(assertPublicHttpUrl("http://internal.example.com/")).rejects.toThrow(
      UnsafeUrlError
    );
  });

  it("allows a hostname that resolves to a public IP", async () => {
    mockedLookup.mockResolvedValue([{ address: "203.0.113.10", family: 4 }]);
    await expect(assertPublicHttpUrl("https://guild-site.example.com/guilds/1")).resolves.toBeUndefined();
  });

  it("rejects when DNS resolution fails", async () => {
    mockedLookup.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertPublicHttpUrl("https://deadserver.example.com/")).rejects.toThrow(
      UnsafeUrlError
    );
  });

  it("rejects instead of hanging forever when DNS resolution never settles", async () => {
    vi.useFakeTimers();
    mockedLookup.mockReturnValue(new Promise(() => {}));

    const assertion = expect(assertPublicHttpUrl("https://slowdns.example.com/")).rejects.toThrow(
      UnsafeUrlError
    );
    await vi.advanceTimersByTimeAsync(10000);
    await assertion;

    vi.useRealTimers();
  });
});
