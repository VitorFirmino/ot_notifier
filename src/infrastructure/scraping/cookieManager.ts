import axios from "axios";
import type { ServerConfig } from "@shared/types/index";
import { loadServerConfig, saveServerConfig } from "@infrastructure/storage/serverConfigManager";

const extractCookieTimestamp = (cookie: string): number | null => {
  const match = cookie.match(/cf_clearance=([^-]+)-(\d+)-/);
  if (match && match[2]) {
    return parseInt(match[2], 10);
  }
  return null;
};

const isCookieExpired = (cookie: string, maxAge: number = 7200): boolean => {
  const timestamp = extractCookieTimestamp(cookie);
  if (!timestamp) return true;

  const age = Date.now() / 1000 - timestamp;
  return age > maxAge;
};

const renewCookies = async (
  serverId: string,
  testUrl: string,
  currentHeaders: Record<string, string>
): Promise<Record<string, string> | null> => {
  try {
    const headersWithoutClearance = { ...currentHeaders };
    if (headersWithoutClearance.cookie) {
      const cookieParts = headersWithoutClearance.cookie
        .split("; ")
        .filter((part) => !part.startsWith("cf_clearance="));
      headersWithoutClearance.cookie = cookieParts.join("; ");
    }

    const response = await axios.get(testUrl, {
      timeout: 30000,
      headers: headersWithoutClearance,
      maxRedirects: 5,
      decompress: true,
      validateStatus: (status) => status < 500,
    });

    const setCookieHeaders = response.headers["set-cookie"];
    if (!setCookieHeaders) {
      return null;
    }

    const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    const cookieParts: string[] = [];

    const oldCookie = currentHeaders.cookie || "";
    if (oldCookie) {
      const oldParts = oldCookie.split("; ").filter((part) => !part.startsWith("cf_clearance="));
      cookieParts.push(...oldParts);
    }

    cookieArray.forEach((cookieHeader) => {
      const cookieValue = cookieHeader.split(";")[0].trim();
      if (cookieValue) {
        const cookieName = cookieValue.split("=")[0];
        const index = cookieParts.findIndex((part) => part.startsWith(`${cookieName}=`));
        if (index >= 0) {
          cookieParts.splice(index, 1);
        }
        cookieParts.push(cookieValue);
      }
    });

    if (cookieParts.length === 0) {
      return null;
    }

    return {
      ...currentHeaders,
      cookie: cookieParts.join("; "),
    };
  } catch (error) {
    console.error(`❌ Erro ao renovar cookies para ${serverId}:`, error);
    return null;
  }
};

export const ensureValidCookies = async (serverId: string): Promise<boolean> => {
  const config = loadServerConfig(serverId);
  if (!config?.settings?.headers?.cookie) {
    return false;
  }

  const cookie = config.settings.headers.cookie;

  if (!cookie.includes("cf_clearance")) {
    return true;
  }

  if (!isCookieExpired(cookie)) {
    return true;
  }

  const testUrl = Object.values(config.characters)[0]?.url || config.guild.url;

  const newHeaders = await renewCookies(serverId, testUrl, config.settings.headers);

  if (newHeaders && newHeaders.cookie) {
    const updatedConfig: ServerConfig = {
      ...config,
      settings: {
        ...config.settings,
        headers: newHeaders,
      },
    };

    await saveServerConfig(updatedConfig);
    return true;
  }

  return false;
};
