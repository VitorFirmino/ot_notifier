import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import pLimit from "p-limit";
import { getRandomUserAgent } from "./utils/userAgentGenerator";
import { saveBrowserCookiesToJar } from "./http/axiosClient";
import { getProxyConfig, getProxyConfigForSession } from "./utils/proxyConfig";
import { solveCloudflareChallenge } from "./utils/capsolverClient";
import {
  acquireProxyForDomain,
  releasePinnedProxy,
  markDomainNeedsProxy,
  domainNeedsProxy,
} from "./utils/proxySessionManager";
import { getCachedClearance, saveClearance, invalidateClearance } from "./utils/clearanceCache";
import { isCloudflareBlockPage } from "./utils/cloudflareDetector";

type Session = {
  browser: Browser;
  context: BrowserContext;
  proxySessionId: string | null;
};

export type NavigationTimeouts = {
  gotoTimeoutMs?: number;
  networkIdleTimeoutMs?: number;
};

const MAX_CONCURRENT_ANTIBOT_NAVIGATIONS = 4;

class PlaywrightManager {
  private sessions = new Map<string, Promise<Session>>();
  private readonly navigationLimiter = pLimit(MAX_CONCURRENT_ANTIBOT_NAVIGATIONS);

  private async createSession(
    serverId: string,
    customHeaders?: Record<string, string>,
    proxySessionId?: string | null,
    forcedUserAgent?: string
  ): Promise<Session> {
    const userAgent =
      forcedUserAgent ||
      customHeaders?.["User-Agent"] ||
      customHeaders?.["user-agent"] ||
      getRandomUserAgent();

    let browser: Browser;
    let context: BrowserContext;

    const proxy =
      (proxySessionId ? getProxyConfigForSession(proxySessionId) : getProxyConfig()) ?? undefined;

    const contextOptions = {
      userAgent,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Language": customHeaders?.["Accept-Language"] || "pt-BR,pt;q=0.9,en-US;q=0.8",
      },
      proxy,
    };
    const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

    try {
      const patchrightMod = await import("patchright");
      const patchrightChromium = patchrightMod.chromium;
      if (typeof patchrightChromium?.launch !== "function") {
        throw new Error("patchright module present but chromium.launch is missing");
      }
      browser = (await patchrightChromium.launch({ headless: false, args: launchArgs })) as unknown as Browser;
      context = await browser.newContext({
        ignoreHTTPSErrors: true,
        proxy,
        ...(forcedUserAgent ? { userAgent: forcedUserAgent } : {}),
      });
      return { browser, context, proxySessionId: proxySessionId ?? null };
    } catch (patchrightErr: unknown) {
      console.debug(`[${serverId}] Patchright não disponível:`, patchrightErr);
    }

    try {
      let launchCloak: ((opts: { headless: boolean; humanize: boolean; args: string[] }) => Promise<unknown>) | null = null;
      try {
        const cloakMod = await import("cloakbrowser");
        launchCloak = cloakMod.launch;
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
      return { browser, context, proxySessionId: proxySessionId ?? null };
    } catch (cloakError: unknown) {
      const msg = cloakError instanceof Error ? cloakError.message : String(cloakError);
      console.warn(`[${serverId}] CloakBrowser indisponível, tentando Playwright Chromium padrão: ${msg}`);
    }

    browser = await chromium.launch({
      headless: true,
      args: launchArgs,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
    context = await browser.newContext(contextOptions);

    return { browser, context, proxySessionId: proxySessionId ?? null };
  }

    private getSessionKey(urlOrDomain: string): string {
      try {
        return new URL(urlOrDomain).hostname;
      } catch {
        return urlOrDomain || "default";
      }
    }

    private async getSession(
      url: string,
      customHeaders?: Record<string, string>
    ): Promise<Session> {
      const key = this.getSessionKey(url);
      const existing = this.sessions.get(key);
      if (existing) {
        const session = await existing.catch(() => null);
        const staleWithoutProxy = Boolean(session) && !session?.proxySessionId && (await domainNeedsProxy(key));

        if (!staleWithoutProxy) return existing;

        await this.closeBrowser(key);
      }

      const created = this.createSessionWithClearance(key, customHeaders);
      this.sessions.set(key, created);
      return created;
    }

    private async createSessionWithClearance(
      domain: string,
      customHeaders?: Record<string, string>
    ): Promise<Session> {
      const pooled = await acquireProxyForDomain(domain);
      const proxySessionId = pooled?.sessionId ?? null;

      const cached = await getCachedClearance(domain);
      const reusableClearance = cached?.proxySessionId === proxySessionId ? cached : null;

      const session = await this.createSession(
        domain,
        customHeaders,
        proxySessionId,
        reusableClearance?.userAgent
      );

      if (reusableClearance) {
        await session.context
          .addCookies([{ name: "cf_clearance", value: reusableClearance.cfClearance, domain, path: "/" }])
          .catch((cookieErr: unknown) => {
            console.warn(`[${domain}] Falha ao injetar cf_clearance do cache:`, cookieErr);
          });
      }

      return session;
    }

    async fetchPageContent(
      url: string,
      serverId?: string,
      customHeaders?: Record<string, string>,
      navigationOptions?: NavigationTimeouts
    ): Promise<string | null> {
      return this.navigationLimiter(() =>
        this.fetchPageContentInternal(url, serverId, customHeaders, navigationOptions)
      );
    }

    private async harvestClearanceCookie(
      page: Page,
      url: string,
      proxySessionId?: string | null
    ): Promise<void> {
      const domain = new URL(url).hostname;

      try {
        const cookies = await page.context().cookies(url);
        const clearance = cookies.find((cookie) => cookie.name === "cf_clearance");
        if (!clearance?.value) return;

        const cached = await getCachedClearance(domain);
        if (cached?.cfClearance === clearance.value) return;

        const userAgent = await page.evaluate(() => navigator.userAgent);

        await saveClearance(domain, {
          cfClearance: clearance.value,
          userAgent,
          proxySessionId: proxySessionId ?? null,
          exitIp: null,
          solvedAt: Date.now(),
        });
      } catch (harvestErr: unknown) {
        console.warn(`[${domain}] Falha ao guardar cf_clearance do navegador:`, harvestErr);
      }
    }

    private async navigateAndWaitForContent(
      page: Page,
      url: string,
      serverId?: string,
      navigationOptions?: NavigationTimeouts,
      proxySessionId?: string | null
    ): Promise<void> {
      const gotoTimeoutMs = navigationOptions?.gotoTimeoutMs ?? 45000;
      const networkIdleTimeoutMs = navigationOptions?.networkIdleTimeoutMs ?? 8000;

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: gotoTimeoutMs,
      }).catch((gotoErr: unknown) => {
        console.warn(`[${serverId || "default"}] Aviso em page.goto(${url}):`, gotoErr);
      });

      const willRetryThroughProxy = !proxySessionId && Boolean(getProxyConfig());
      const maxChallengeWaits = willRetryThroughProxy ? 4 : 15;

      let stillChallenged = false;
      for (let attempt = 0; attempt < maxChallengeWaits; attempt++) {
        const title = await page.title();
        stillChallenged = title.includes("Just a moment") || title.includes("Um momento");
        if (!stillChallenged) break;
        await page.waitForTimeout(1000);
      }

      if (stillChallenged) {
        const domain = new URL(url).hostname;
        await invalidateClearance(domain);

        if (!proxySessionId && getProxyConfig()) {
          console.warn(`[${serverId || "default"}] ${domain} exige desafio; próxima tentativa sairá por sessão fixa de proxy.`);
          await markDomainNeedsProxy(domain);
          return;
        }

        const solved = await solveCloudflareChallenge(url, proxySessionId);
        if (solved) {
          await page.context().addCookies([
            { name: "cf_clearance", value: solved.cfClearance, domain, path: "/" },
          ]);
          await page.setExtraHTTPHeaders({ "User-Agent": solved.userAgent });
          await saveClearance(domain, {
            cfClearance: solved.cfClearance,
            userAgent: solved.userAgent,
            proxySessionId: proxySessionId ?? null,
            exitIp: null,
            solvedAt: Date.now(),
          });
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: gotoTimeoutMs }).catch((gotoErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao renavegar após resolver desafio:`, gotoErr);
          });
        } else {
          await releasePinnedProxy(domain);
        }
      }

      const blocked = isCloudflareBlockPage(await page.content().catch(() => ""));
      if (blocked) {
        const domain = new URL(url).hostname;
        console.warn(`[${serverId || "default"}] IP bloqueado por ${domain}, trocando de endereço de saída.`);
        await invalidateClearance(domain);

        if (proxySessionId) {
          await releasePinnedProxy(domain);
        } else if (getProxyConfig()) {
          await markDomainNeedsProxy(domain);
        }
      } else {
        await this.harvestClearanceCookie(page, url, proxySessionId);
      }

      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle", { timeout: networkIdleTimeoutMs }).catch((networkIdleErr: unknown) => {
        console.warn(`[${serverId || "default"}] Aviso ao esperar networkidle:`, networkIdleErr);
      });
    }

    private async fetchPageContentInternal(
      url: string,
      serverId?: string,
      customHeaders?: Record<string, string>,
      navigationOptions?: NavigationTimeouts
    ): Promise<string | null> {
      let pageClosed = false;
      try {
        const { context, proxySessionId } = await this.getSession(url, customHeaders);
        const page = await context.newPage();

        try {
          await this.navigateAndWaitForContent(page, url, serverId, navigationOptions, proxySessionId);

          const cookies = await context.cookies();
          if (cookies && cookies.length > 0) {
            await saveBrowserCookiesToJar(cookies, url);
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
          await this.closeBrowser(url).catch((closeBrowserErr: unknown) => {
            console.warn(`[${serverId || "default"}] Erro ao fechar navegador:`, closeBrowserErr);
          });
        }
        return null;
      }
    }

    async selectWorldAndFetch(
      url: string,
      worldValue: string,
      serverId?: string,
      customHeaders?: Record<string, string>,
      navigationOptions?: NavigationTimeouts
    ): Promise<string | null> {
      return this.navigationLimiter(() =>
        this.selectWorldAndFetchInternal(url, worldValue, serverId, customHeaders, navigationOptions)
      );
    }

    private async selectWorldAndFetchInternal(
      url: string,
      worldValue: string,
      serverId?: string,
      customHeaders?: Record<string, string>,
      navigationOptions?: NavigationTimeouts
    ): Promise<string | null> {
      let pageClosed = false;
      try {
        const { context, proxySessionId } = await this.getSession(url, customHeaders);
        const page = await context.newPage();

        try {
          await this.navigateAndWaitForContent(page, url, serverId, navigationOptions, proxySessionId);

          const select = page.locator("select").first();
          if ((await select.count()) === 0) return null;

          await select.selectOption(worldValue).catch((selectErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao selecionar mundo (${worldValue}):`, selectErr);
          });

          await page.waitForTimeout(2000);
          const networkIdleTimeoutMs = navigationOptions?.networkIdleTimeoutMs ?? 8000;
          await page.waitForLoadState("networkidle", { timeout: networkIdleTimeoutMs }).catch((networkIdleErr: unknown) => {
            console.warn(`[${serverId || "default"}] Aviso ao esperar networkidle pós-seleção:`, networkIdleErr);
          });

          const cookies = await context.cookies();
          if (cookies && cookies.length > 0) {
            await saveBrowserCookiesToJar(cookies, url);
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
        console.warn(`[${serverId || "default"}] Erro no PlaywrightManager ao selecionar mundo em ${url}:`, fetchErr);
        if (!pageClosed) {
          await this.closeBrowser(url).catch((closeBrowserErr: unknown) => {
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
        const { context } = await this.getSession(url, customHeaders);
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
          await this.closeBrowser(url).catch((closeErr: unknown) => {
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

  async performLogin(loginUrl: string, username: string, password: string): Promise<boolean> {
    return this.navigationLimiter(async () => {
      const { context } = await this.getSession(loginUrl);
      const page = await context.newPage();

      try {
        await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

        const passwordField = page.locator('input[type="password"]').first();
        await passwordField.waitFor({ timeout: 15000 });

        const usernameField = page.locator('input[type="email"], input[type="text"]').first();
        await usernameField.fill(username);
        await passwordField.fill(password);
        await passwordField.press("Enter");

        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch((waitErr: unknown) => {
          console.warn(`[login:${loginUrl}] Aviso ao esperar navegação pós-login:`, waitErr);
        });
        await page.waitForTimeout(2000);

        const cookies = await context.cookies();
        if (cookies.length > 0) {
          await saveBrowserCookiesToJar(cookies, loginUrl);
        }

        const stillHasPasswordField = await page.locator('input[type="password"]').count();
        return stillHasPasswordField === 0;
      } catch (loginErr: unknown) {
        console.warn(`[login:${loginUrl}] Erro ao tentar logar:`, loginErr);
        return false;
      } finally {
        await page.close().catch(() => {});
      }
    });
  }
}

export const playwrightManager = new PlaywrightManager();

