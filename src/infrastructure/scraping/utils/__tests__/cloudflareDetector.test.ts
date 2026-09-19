import { describe, it, expect } from "vitest";
import { isCloudflareBlockPage } from "../cloudflareDetector";

describe("isCloudflareBlockPage", () => {
  it("detects the hard block page served to a banned IP", () => {
    const html = `<!DOCTYPE html><html><head><title>Attention Required! | Cloudflare</title></head><body></body></html>`;
    expect(isCloudflareBlockPage(html)).toBe(true);
  });

  it("detects the error 1020 variant", () => {
    expect(isCloudflareBlockPage("<html><body>Error 1020: Access denied</body></html>")).toBe(true);
  });

  it("does not flag the solvable challenge page as a block", () => {
    const html = `<!DOCTYPE html><html><head><title>Just a moment...</title></head><body></body></html>`;
    expect(isCloudflareBlockPage(html)).toBe(false);
  });

  it("does not flag a normal guild page", () => {
    expect(isCloudflareBlockPage("<html><body><table><tr><td>Guild Members</td></tr></table></body></html>")).toBe(false);
  });

  it("returns false for empty html", () => {
    expect(isCloudflareBlockPage("")).toBe(false);
  });
});
