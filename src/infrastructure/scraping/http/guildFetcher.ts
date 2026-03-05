import axios from "axios";
import {
  REQUEST_TIMEOUT,
  createRequestHeaders,
  createMinimalHeaders,
  getCookieJar,
} from "./axiosClient";
import { scheduleWithBottleneck } from "./bottleneckLimiter";
import { extractServerIdFromUrl } from "../utils/urlUtils";
import {
  detectCloudflareFromResponse,
  detectCloudflareFromHtml,
  markServerAsCloudflare,
} from "../utils/cloudflareDetector";
import { detectServerFatalPage } from "../utils/pageHealthDetector";
import { playwrightManager } from "../playwrightManager";

export const fetchGuildPageWithHeaders = async (
  guildUrl: string,
  customHeaders: Record<string, string>
): Promise<string> => {
  const serverId = extractServerIdFromUrl(guildUrl);

  return scheduleWithBottleneck(async () => {
    try {
      const jar = getCookieJar(serverId);

      const response = await axios.get(guildUrl, {
        jar,
        timeout: REQUEST_TIMEOUT,
        headers: customHeaders,
        maxRedirects: 5,
        decompress: true,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200) {
        const html = response.data;

        const detectedFatalReason = detectServerFatalPage(html);
        if (detectedFatalReason) {
          throw new Error(`servidor retornou página com ${detectedFatalReason}`);
        }

        if (detectCloudflareFromHtml(html)) {
          await markServerAsCloudflare(serverId);
        }

        return html;
      }

      if (response.status === 403) {
        if (playwrightManager && typeof playwrightManager.fetchPageContent === "function") {
          const fallbackHtml = await playwrightManager.fetchPageContent(
            guildUrl,
            serverId,
            customHeaders
          );

          if (fallbackHtml) {
            const detectedFatalReason = detectServerFatalPage(fallbackHtml);
            if (detectedFatalReason) {
              throw new Error(`servidor retornou página com ${detectedFatalReason}`);
            }
            return fallbackHtml;
          }
        }
      }

      throw new Error(`Status ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error) && detectCloudflareFromResponse(error)) {
        await markServerAsCloudflare(serverId);
      }

      if (axios.isAxiosError(error) && error.response?.status === 403) {
        if (playwrightManager && typeof playwrightManager.fetchPageContent === "function") {
          const fallbackHtml = await playwrightManager.fetchPageContent(
            guildUrl,
            serverId,
            customHeaders
          );

          if (fallbackHtml) {
            const detectedFatalReason = detectServerFatalPage(fallbackHtml);
            if (detectedFatalReason) {
              throw new Error(`servidor retornou página com ${detectedFatalReason}`);
            }
            return fallbackHtml;
          }
        }
      }

      const message = error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(`Erro ao acessar ${guildUrl}: ${message}`);
    }
  }, serverId);
};

export const fetchGuildPage = async (guildUrl: string): Promise<string> => {
  const urlObj = new URL(guildUrl);
  const serverId = extractServerIdFromUrl(guildUrl);
  let hadForbidden = false;
  let fatalPageReason: string | null = null;

  const headerStrategies = [createRequestHeaders(urlObj.origin), createMinimalHeaders()];

  const tryGuildStrategy = async (
    headers: Record<string, string>,
    index: number
  ): Promise<string | null> => {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * index));
    }

    return scheduleWithBottleneck(async () => {
      try {
        const jar = getCookieJar(serverId);

        const response = await axios.get(guildUrl, {
          jar,
          timeout: REQUEST_TIMEOUT,
          headers,
          decompress: true,
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });

        if (response.status === 200) {
          if (typeof response.data === "string") {
            const htmlLength = response.data.length;

            if (htmlLength < 100) {
              if (serverId) {
                console.warn(
                  `⚠️ [${serverId}] HTML muito curto (${htmlLength} chars) - pode ser página de erro`
                );
              }
              return null;
            }

            if (detectCloudflareFromHtml(response.data)) {
              await markServerAsCloudflare(serverId);
            }

            const detectedFatalReason = detectServerFatalPage(response.data);
            if (detectedFatalReason) {
              fatalPageReason = detectedFatalReason;
              if (serverId) {
                console.warn(
                  `⚠️ [${serverId}] Página de guild retornou erro fatal (${detectedFatalReason})`
                );
              }
              return null;
            }
          }
          return response.data;
        }

        if (response.status === 403) {
          hadForbidden = true;
        }

        if (serverId) {
          console.warn(
            `⚠️ [${serverId}] Guild page retornou status ${response.status} (esperado 200)`
          );
        }

        return null;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const statusText = error.response?.statusText;

          if (detectCloudflareFromResponse(error)) {
            await markServerAsCloudflare(serverId);
          }

          if (status === 403) {
            hadForbidden = true;
            console.warn(
              `⚠️ [${serverId}] Guild page retornou 403 (Forbidden) - possível proteção`
            );
            return null;
          }
          if (status && status < 500) {
            console.warn(`⚠️ [${serverId}] Guild page retornou ${status} ${statusText || ""}`);
            return null;
          }
        }
        return null;
      }
    }, serverId);
  };

  for (const [index, headers] of headerStrategies.entries()) {
    const result = await tryGuildStrategy(headers, index);
    if (result) {
      return result;
    }
  }

  if (hadForbidden) {
    if (playwrightManager && typeof playwrightManager.fetchPageContent === "function") {
      const fallbackHtml = await playwrightManager.fetchPageContent(
        guildUrl,
        serverId,
        createMinimalHeaders()
      );

      if (fallbackHtml) {
        const detectedFatalReason = detectServerFatalPage(fallbackHtml);
        if (detectedFatalReason) {
          fatalPageReason = detectedFatalReason;
        } else {
          console.log(`✅ [${serverId}] Guild carregada via Playwright após bloqueio 403`);
          return fallbackHtml;
        }
      }
    }
  }

  if (fatalPageReason) {
    throw new Error(`Erro ao acessar ${guildUrl}: servidor retornou página com ${fatalPageReason}`);
  }

  console.warn(`⚠️ [${serverId}] Todas as estratégias falharam para guild URL: ${guildUrl}`);

  if (hadForbidden) {
    throw new Error(`Erro ao acessar ${guildUrl}: Todas as estratégias falharam (403/proteção anti-bot)`);
  }

  throw new Error(`Erro ao acessar ${guildUrl}: Todas as estratégias falharam`);
};
