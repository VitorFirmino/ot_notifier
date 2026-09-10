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
import { markServerAsCloudflare } from "../utils/cloudflareDetector";
import { playwrightManager } from "../playwrightManager";

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

    try {
      return parseCharacterFromHtml(response.html, name, url);
    } catch (err: unknown) {
      console.warn(`Error parsing character HTML for ${name}:`, err);
      return null;
    }
  };

  let lastError: Error | null = null;

  for (const [index, headers] of headerStrategies.entries()) {
    try {
      const result = await tryStrategy(headers, index);
      if (result) {
        return result;
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

  if (hadForbidden) {
    const fallbackHeaders = customHeaders || createMinimalHeaders();
    if (playwrightManager && typeof playwrightManager.fetchPageContent === "function") {
      const fallbackHtml = await playwrightManager.fetchPageContent(
        url,
        finalServerId,
        fallbackHeaders
      );
      if (fallbackHtml) {
        const detectedFatalReason = detectServerFatalPage(fallbackHtml);
        if (detectedFatalReason) {
          fatalPageReason = detectedFatalReason;
        } else {
          await markServerAsCloudflare(finalServerId);
          return parseCharacterFromHtml(fallbackHtml, name, url);
        }
      }
    }

    lastError = new Error("Todas as estratégias falharam (403/proteção anti-bot)");
  }

  if (fatalPageReason) {
    throw new Error(`Erro ao acessar ${url}: servidor retornou página com ${fatalPageReason}`);
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Erro desconhecido";
  throw new Error(`Erro ao acessar ${url}: ${errorMessage}`);
};
