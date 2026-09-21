import axios from "axios";
import type { CharacterStatus } from "@shared/types/index";
import {
  createDefaultHeaderStrategies,
  createMinimalHeaders,
  fetchWithAxiosResult,
  logAxiosError,
} from "./axiosClient";
import { parseCharacterFromHtml } from "../parsers/characterParser";
import { extractServerIdFromUrl } from "@shared/utils/serverIdentity";
import { detectServerFatalPage } from "../utils/pageHealthDetector";
import { detectCloudflareFromHtml, markServerAsCloudflare } from "../utils/cloudflareDetector";
import { playwrightManager } from "../playwrightManager";

const CLIENT_RENDERED_MARKERS = ["/_next/", "__next_f", "__nuxt", "data-reactroot", "ng-version"];

export const getCharacterStatus = async (
  name: string,
  url: string,
  customHeaders?: Record<string, string>,
  serverId?: string
): Promise<CharacterStatus> => {
  const finalServerId = serverId || extractServerIdFromUrl(url);
  const urlObj = new URL(url);
  const origin = urlObj.origin;

  const headerStrategies = customHeaders ? [customHeaders] : createDefaultHeaderStrategies(origin);
  let hadForbidden = false;
  let fatalPageReason: string | null = null;
  let networkErrorCode: string | null = null;

  const tryStrategy = async (
    headers: Record<string, string>,
    index: number
  ): Promise<CharacterStatus | null> => {
    if (index > 0) {
      const delay = Math.min(1000 * index, 3000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetchWithAxiosResult(url, headers, finalServerId);
    if (response.statusCode === 403) {
      hadForbidden = true;
    }
    if (response.errorCode) {
      networkErrorCode = response.errorCode;
    }
    if (!response.html) return null;

    const detectedFatalReason = detectServerFatalPage(response.html);
    if (detectedFatalReason) {
      fatalPageReason = detectedFatalReason;
      return null;
    }

    const lowerHtml = response.html.toLowerCase();
    lastHtmlLooksClientRendered = CLIENT_RENDERED_MARKERS.some((marker) => lowerHtml.includes(marker));

    try {
      return parseCharacterFromHtml(response.html, name, url);
    } catch (err: unknown) {
      console.warn(`Error parsing character HTML for ${name}:`, err);
      return null;
    }
  };

  let lastError: Error | null = null;
  let incompleteResult: CharacterStatus | null = null;
  let lastHtmlLooksClientRendered = false;

  for (const [index, headers] of headerStrategies.entries()) {
    try {
      const result = await tryStrategy(headers, index);
      if (result?.level !== null && result !== null) {
        return result;
      }
      if (result) {
        incompleteResult = result;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logAxiosError(finalServerId, name, error);
      }
    }

    if (index === headerStrategies.length - 1) {
      lastError = new Error(
        networkErrorCode ? `Todas as estratégias falharam (${networkErrorCode})` : "Todas as estratégias falharam"
      );
    }
  }

  const shouldRenderInBrowser = Boolean(incompleteResult) && lastHtmlLooksClientRendered;

  if (hadForbidden || shouldRenderInBrowser) {
    const fallbackHeaders = customHeaders || createMinimalHeaders();
    if (playwrightManager && typeof playwrightManager.fetchPageContent === "function") {
      const fallbackHtml = await playwrightManager.fetchPageContent(
        url,
        finalServerId,
        fallbackHeaders
      );
      if (fallbackHtml) {
        const detectedFatalReason = detectServerFatalPage(fallbackHtml);
        const stillChallenged = detectCloudflareFromHtml(fallbackHtml);

        if (detectedFatalReason) {
          fatalPageReason = detectedFatalReason;
        }

        if (!detectedFatalReason && !stillChallenged) {
          await markServerAsCloudflare(finalServerId);
          return parseCharacterFromHtml(fallbackHtml, name, url);
        }
      }
    }

    lastError = new Error("Todas as estratégias falharam (403/proteção anti-bot)");
  }

  if (incompleteResult) {
    return incompleteResult;
  }

  if (fatalPageReason) {
    throw new Error(`Erro ao acessar ${url}: servidor retornou página com ${fatalPageReason}`);
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Erro desconhecido";
  throw new Error(`Erro ao acessar ${url}: ${errorMessage}`);
};
