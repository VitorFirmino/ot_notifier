import { chromium, type Browser, type BrowserContext } from "playwright";
import { getRandomUserAgent } from "./utils/userAgentGenerator";

type Session = {
  browser: Browser;
  context: BrowserContext;
};

class PlaywrightManager {
  private sessions = new Map<string, Promise<Session>>();

  private async createSession(
    serverId: string,
    customHeaders?: Record<string, string>
  ): Promise<Session> {
    const userAgent = customHeaders?.["User-Agent"] || customHeaders?.["user-agent"] || getRandomUserAgent();

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      userAgent,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Language": customHeaders?.["Accept-Language"] || "pt-BR,pt;q=0.9,en-US;q=0.8",
      },
    });

    return { browser, context };
  }

  private getSessionKey(serverId?: string): string {
    return serverId || "default";
  }

  private async getSession(
    serverId?: string,
    customHeaders?: Record<string, string>
  ): Promise<Session> {
    const key = this.getSessionKey(serverId);
    const existing = this.sessions.get(key);
    if (existing) {
      return existing;
    }

    const created = this.createSession(key, customHeaders);
    this.sessions.set(key, created);
    return created;
  }

  async fetchPageContent(
    url: string,
    serverId?: string,
    customHeaders?: Record<string, string>
  ): Promise<string | null> {
    let pageClosed = false;
    try {
      const { context } = await this.getSession(serverId, customHeaders);
      const page = await context.newPage();

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await page.waitForTimeout(500);
        return await page.content();
      } finally {
        pageClosed = true;
        await page.close().catch(() => undefined);
      }
    } catch {
      if (!pageClosed) {
        await this.closeBrowser(serverId || "default").catch(() => undefined);
      }
      return null;
    }
  }

  async closeBrowser(serverId: string): Promise<void> {
    const key = this.getSessionKey(serverId);
    const sessionPromise = this.sessions.get(key);
    if (!sessionPromise) return;

    this.sessions.delete(key);

    try {
      const session = await sessionPromise;
      await session.context.close();
      await session.browser.close();
    } catch {
      return;
    }
  }

  async closeAllBrowsers(): Promise<void> {
    const keys = Array.from(this.sessions.keys());
    await Promise.all(keys.map((key) => this.closeBrowser(key)));
  }
}

export const playwrightManager = new PlaywrightManager();
