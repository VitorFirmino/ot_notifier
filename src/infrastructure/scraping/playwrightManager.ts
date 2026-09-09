import { chromium, type Browser, type BrowserContext } from "playwright";
import pLimit from "p-limit";
import { getRandomUserAgent } from "./utils/userAgentGenerator";
import { saveBrowserCookiesToJar } from "./http/axiosClient";

type Session = {
  browser: Browser;
  context: BrowserContext;
};

const MAX_CONCURRENT_ANTIBOT_NAVIGATIONS = 4;

class PlaywrightManager {
  private sessions = new Map<string, Promise<Session>>();
  private readonly navigationLimiter = pLimit(MAX_CONCURRENT_ANTIBOT_NAVIGATIONS);

  private async createSession(
    serverId: string,
    customHeaders?: Record<string, string>
  ): Promise<Session> {
    const userAgent =
      customHeaders?.["User-Agent"] || customHeaders?.["user-agent"] || getRandomUserAgent();

    let browser: Browser;
    let context: BrowserContext;

    const contextOptions = {
      userAgent,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Language": customHeaders?.["Accept-Language"] || "pt-BR,pt;q=0.9,en-US;q=0.8",
      },
    };
    const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

    try {
      const patchrightMod = await import("patchright");
      const patchrightChromium = (patchrightMod as any).chromium;
      if (typeof patchrightChromium?.launch !== "function") {
        throw new Error("patchright module present but chromium.launch is missing");
      }
      browser = (await patchrightChromium.launch({ headless: false, args: launchArgs })) as unknown as Browser;
      context = await browser.newContext({ ignoreHTTPSErrors: true });
      return { browser, context };
    } catch (patchrightErr: unknown) {
      console.debug(`[${serverId}] Patchright não disponível:`, patchrightErr);
    }

    try {
      let launchCloak: ((opts: { headless: boolean; humanize: boolean; args: string[] }) => Promise<unknown>) | null = null;
      try {
        const cloakMod = await import("cloakbrowser");
        launchCloak = (cloakMod as any).launch || (cloakMod as any).default?.launch;
      } catch (cloakLoadErr: unknown) {
        console.debug(`[${serverId}] CloakBrowser module não disponível:`, cloakLoadErr);
      }

      if (typeof launchCloak !== "function") {
        throw new Error("CloakBrowser module not present or incompatible");
      }
      const cloakBrowser = await launchCloak({
        headless: false,
        humanize: true,
        args: launchArgs,
      });
      browser = cloakBrowser as unknown as Browser;
      context = await browser.newContext(contextOptions);
      return { browser, context };
    } catch (cloakError: unknown) {
      const msg = cloakError instanceof Error ? cloakError.message : String(cloakError);
      console.warn(`[${serverId}] CloakBrowser indisponível, tentando Playwright Chromium padrão: ${msg}`);
    }

    browser = await chromium.launch({ headless: true, args: launchArgs });
    context = await browser.newContext(contextOptions);

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
      return this.navigationLimiter(() =>
        this.fetchPageContentInternal(url, serverId, customHeaders)
      );
    }

    private async fetchPageContentInternal(
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
            timeout: 45000,
          }).catch((gotoErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso em page.goto(${url}):`, gotoErr);
          });

          for (let attempt = 0; attempt < 15; attempt++) {
            const title = await page.title();
            if (!title.includes("Just a moment") && !title.includes("Um momento")) {
              break;
            }
            await page.waitForTimeout(1000);
          }

          await page.waitForTimeout(2000);
          await page.waitForLoadState("domcontentloaded").catch((loadStateErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao esperar domcontentloaded:`, loadStateErr);
          });

          const cookies = await context.cookies();
          if (cookies && cookies.length > 0) {
            await saveBrowserCookiesToJar(cookies, url, serverId);
          }

          for (let attempt = 0; ; attempt++) {
            try {
              return await page.content();
            } catch (contentErr: unknown) {
              if (attempt === 2) throw contentErr;
              await page.waitForTimeout(1500);
            }
          }
        } finally {
          pageClosed = true;
          await page.close().catch((closeErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao fechar aba:`, closeErr);
          });
        }
      } catch (fetchErr: unknown) {
        console.warn(`[${serverId || "default"}] Erro no PlaywrightManager ao acessar ${url}:`, fetchErr);
        if (!pageClosed) {
          await this.closeBrowser(serverId || "default").catch((closeBrowserErr: unknown) => {
            console.warn(`[${serverId || "default"}] Erro ao fechar navegador:`, closeBrowserErr);
          });
        }
        return null;
      }
    }

    async fetchImageBytes(
      url: string,
      serverId?: string,
      customHeaders?: Record<string, string>
    ): Promise<{ buffer: Buffer; contentType: string } | null> {
      return this.navigationLimiter(() =>
        this.fetchImageBytesInternal(url, serverId, customHeaders)
      );
    }

    private async fetchImageBytesInternal(
      url: string,
      serverId?: string,
      customHeaders?: Record<string, string>
    ): Promise<{ buffer: Buffer; contentType: string } | null> {
      let pageClosed = false;
      try {
        const { context } = await this.getSession(serverId, customHeaders);
        const page = await context.newPage();

        try {
          const goto = () =>
            page.goto(url, { timeout: 20000 }).catch((gotoErr: unknown) => {
              console.warn(`[${serverId || "default"}] Aviso em page.goto(imagem ${url}):`, gotoErr);
              return null;
            });

          let response = await goto();
          const isImage = (contentType: string) => contentType.startsWith("image/");

          if (!response || !response.ok() || !isImage(response.headers()["content-type"] || "")) {
            const origin = new URL(url).origin;
            await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 20000 }).catch((originErr: unknown) => {
              console.debug(`[${serverId || "default"}] Aviso ao navegar para origin ${origin}:`, originErr);
            });
            await page.waitForTimeout(3000);
            response = await goto();
          }

          if (!response || !response.ok()) return null;
          const contentType = response.headers()["content-type"] || "";
          if (!isImage(contentType)) return null;

          const buffer = await response.body();
          return { buffer, contentType };
        } finally {
          pageClosed = true;
          await page.close().catch((closeErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao fechar aba (imagem):`, closeErr);
          });
        }
      } catch (fetchErr: unknown) {
        console.warn(`[${serverId || "default"}] Erro no PlaywrightManager ao acessar imagem ${url}:`, fetchErr);
        if (!pageClosed) {
          await this.closeBrowser(serverId || "default").catch((closeErr: unknown) => {
            console.debug(`[${serverId || "default"}] Aviso ao fechar browser após erro:`, closeErr);
          });
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
      } catch (closeErr: unknown) {
        console.warn(`[${serverId}] Erro ao fechar sessão de browser:`, closeErr);
      }
    }

  async closeAllBrowsers(): Promise<void> {
    const keys = Array.from(this.sessions.keys());
    await Promise.all(keys.map((key) => this.closeBrowser(key)));
  }
}

export const playwrightManager = new PlaywrightManager();

