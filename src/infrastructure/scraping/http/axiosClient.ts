import axios, { type AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar, Cookie } from "tough-cookie";
import { getRandomUserAgent } from "../utils/userAgentGenerator";
import { scheduleWithBottleneck } from "./bottleneckLimiter";
import {
  detectCloudflareFromResponse,
  detectCloudflareFromHtml,
  markServerAsCloudflare,
} from "../utils/cloudflareDetector";

export const REQUEST_TIMEOUT = 15000;

wrapper(axios);

axiosRetry(axios, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
  shouldResetTimeout: true,
});

const cookieJars = new Map<string, CookieJar>();

export const getCookieJar = (serverId?: string): CookieJar => {
  const key = serverId || "default";

  if (!cookieJars.has(key)) {
    cookieJars.set(key, new CookieJar());
  }

  const jar = cookieJars.get(key);
  if (!jar) {
    throw new Error(`CookieJar não disponível para ${key}`);
  }

  return jar;
};

export const saveBrowserCookiesToJar = async (
  cookies: Array<{ name: string; value: string; domain?: string; path?: string }>,
  targetUrl: string,
  serverId?: string
): Promise<void> => {
  if (!cookies || !cookies.length) return;
  try {
    const jar = getCookieJar(serverId);
    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname;

    for (const cookie of cookies) {
      try {
        const cookieObj = new Cookie({
          key: cookie.name,
          value: cookie.value,
          domain: (cookie.domain || domain).replace(/^\./, ""),
          path: cookie.path || "/",
        });
        await jar.setCookie(cookieObj, targetUrl);
      } catch (err: unknown) {
        continue;
      }
    }
  } catch (err: unknown) {
    return;
  }
};

const loadCookiesIntoJar = async (
  jar: CookieJar,
  cookieString: string,
  domain: string
): Promise<void> => {
  if (!cookieString) return;

  try {
    const cookieParts = cookieString.split(";").map((part) => part.trim());

    for (const cookiePart of cookieParts) {
      if (!cookiePart) continue;

      const [name, ...valueParts] = cookiePart.split("=");
      if (!name || !valueParts.length) continue;

      const value = valueParts.join("=");
      const cookieName = name.trim();
      const cookieValue = value.trim();

      if (!cookieName || !cookieValue) continue;

      try {
        const cookie = Cookie.parse(`${cookieName}=${cookieValue}`);
        if (cookie) {
          cookie.domain = domain;
          cookie.path = "/";
          await jar.setCookie(cookie, `https://${domain}`);
        }
      } catch (err: unknown) {
        continue;
      }
    }
  } catch (err: unknown) {
    return;
  }
};

export const createRequestHeaders = (origin: string): Record<string, string> => {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: origin,
    Origin: origin,
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
  };
};

export const createMinimalHeaders = (): Record<string, string> => {
  return {
    "User-Agent": getRandomUserAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
  };
};

export const createDefaultHeaderStrategies = (origin: string): Record<string, string>[] => {
  const baseHeaders = {
    "User-Agent": getRandomUserAgent(),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
  };

  return [
    {
      ...baseHeaders,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Referer: origin,
      Origin: origin,
      "Cache-Control": "max-age=0",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
    },
    {
      ...baseHeaders,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: origin,
      "Upgrade-Insecure-Requests": "1",
    },
    {
      ...baseHeaders,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  ];
};

export const fetchWithAxios = async (
  url: string,
  headers: Record<string, string>,
  serverId?: string
): Promise<string | null> => {
  const result = await fetchWithAxiosResult(url, headers, serverId);
  return result.html;
};

export type AxiosFetchResult = {
  html: string | null;
  statusCode: number | null;
  errorCode?: string;
};

export const fetchWithAxiosResult = async (
  url: string,
  headers: Record<string, string>,
  serverId?: string
): Promise<AxiosFetchResult> => {
  return scheduleWithBottleneck(async () => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      const jar = getCookieJar(serverId);

      if (headers.cookie) {
        await loadCookiesIntoJar(jar, headers.cookie, domain);
      }

      const finalHeaders = { ...headers };
      if (headers.cookie && headers["user-agent"]) {
        finalHeaders["User-Agent"] = headers["user-agent"];
      }

      const response = await axios.get(url, {
        jar,
        timeout: REQUEST_TIMEOUT,
        headers: {
          ...finalHeaders,
          "Accept-Encoding": finalHeaders["Accept-Encoding"] || "gzip, deflate, br",
          cookie: finalHeaders.cookie || undefined,
        },
        maxRedirects: 5,
        decompress: true,
        validateStatus: (status) => status < 500,
        withCredentials: false,
        "axios-retry": {
          retries: 2,
          retryDelay: axiosRetry.exponentialDelay,
        },
      });

      if (response.status === 200) {
        const html = response.data;

        if (serverId && detectCloudflareFromHtml(html)) {
          await markServerAsCloudflare(serverId);
        }

        return {
          html,
          statusCode: 200,
        };
      }

      if (serverId) {
        console.log(`⚠️ [${serverId}] Axios retornou status ${response.status} para ${url}`);
      }

      return {
        html: null,
        statusCode: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (serverId && status) {
          console.log(`⚠️ [${serverId}] Axios erro ${status} para ${url}`);
        }

        if (serverId && detectCloudflareFromResponse(error)) {
          await markServerAsCloudflare(serverId);
        }

        if (status === 403) {
          return {
            html: null,
            statusCode: 403,
          };
        }
        if (status && status < 500) {
          return {
            html: null,
            statusCode: status,
          };
        }

        return {
          html: null,
          statusCode: null,
          errorCode: error.message || error.code,
        };
      }
      return {
        html: null,
        statusCode: null,
        errorCode: error instanceof Error ? error.message : String(error),
      };
    }
  }, serverId);
};

export const logAxiosError = (serverId: string, name: string, error: AxiosError): void => {
  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const code = error.code;
  const message = error.message;

  if (status && status >= 500) {
    console.error(
      `[${serverId}] Axios error para ${name}: Status ${status} ${statusText || ""} - ${message}`
    );
  } else if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    console.error(`[${serverId}] Erro de conexão para ${name}: ${code} - ${message}`);
  } else if (status === 403) {
    console.error(`[${serverId}] Acesso negado (403) para ${name} - possível proteção anti-bot`);
  }
};
