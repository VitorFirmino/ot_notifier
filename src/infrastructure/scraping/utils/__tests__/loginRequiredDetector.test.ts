import { describe, it, expect } from "vitest";
import { detectLoginRequiredPage } from "../loginRequiredDetector";

describe("detectLoginRequiredPage", () => {
  it("detects a login page via the form action pointing at page=login", () => {
    const html = `
      <html><body>
        <form action="sub.php?page=login" method="post">
          <input type="text" name="accountname" />
          <input type="password" name="password" />
          <input type="submit" value="Efetuar Login" />
        </form>
      </body></html>
    `;
    const result = detectLoginRequiredPage(html, "https://ntoultimate.com.br/sub.php?page=guilds");
    expect(result).toBe("https://ntoultimate.com.br/sub.php?page=login");
  });

  it("detects a login page via a password field plus login-related text, even without a matching form action", () => {
    const html = `
      <html><body>
        <h2>Please login to continue</h2>
        <form action="index.php">
          <input type="text" name="user" />
          <input type="password" name="pass" />
        </form>
      </body></html>
    `;
    expect(detectLoginRequiredPage(html, "https://example-ot.com/guilds")).toBe(
      "https://example-ot.com/guilds"
    );
  });

  it("returns null for a normal guild page with no password field", () => {
    const html = `<html><body><table><tr><td>Guild Member</td></tr></table></body></html>`;
    expect(detectLoginRequiredPage(html, "https://example.com/guilds")).toBeNull();
  });

  it("returns null for empty html", () => {
    expect(detectLoginRequiredPage("", "https://example.com/guilds")).toBeNull();
  });
});
