import * as cheerio from "cheerio";
import { createRequestHeaders, fetchWithAxiosResult, type AxiosFetchResult } from "../http/axiosClient";
import { isCharacterProfileHref, extractCharacterNameFromHref } from "../scrapers/characterLinkUtils";
import { extractServerIdFromUrl } from "@shared/utils/serverIdentity";
import { playwrightManager } from "../playwrightManager";
import { loadServerConfig, saveServerConfig } from "@infrastructure/storage/serverConfigManager";
import type { ServerConfig } from "@shared/types/index";

const CANDIDATE_TIMEOUT_MS = 8000;

const ONLINE_LIST_CANDIDATE_PATHS = [
  "/index.php/character/online",
  "?subtopic=online",
  "/index.php?subtopic=online",
  "/community/online",
  "/onlinelist",
  "/online",
];

const buildCandidateUrl = (origin: string, path: string): string =>
  path.startsWith("?") ? `${origin}/${path}` : `${origin}${path}`;

const reorderPathsByLastWorking = (paths: string[], lastWorkingPath?: string): string[] => {
  if (!lastWorkingPath || !paths.includes(lastWorkingPath)) return paths;
  return [lastWorkingPath, ...paths.filter((path) => path !== lastWorkingPath)];
};

const rememberWorkingOnlineListPath = async (
  serverId: string,
  path: string,
  currentConfig: ServerConfig | null
): Promise<void> => {
  if (!currentConfig || currentConfig.lastWorkingOnlineListPath === path) return;
  await saveServerConfig({ ...currentConfig, lastWorkingOnlineListPath: path });
};

const fetchCandidate = async (
  url: string,
  headers: Record<string, string>,
  serverId: string
): Promise<AxiosFetchResult> => {
  const timeout = new Promise<AxiosFetchResult>((resolve) => {
    setTimeout(() => resolve({ html: null, statusCode: null, errorCode: "timeout" }), CANDIDATE_TIMEOUT_MS);
  });
  return Promise.race([fetchWithAxiosResult(url, headers, serverId), timeout]);
};

const extractOnlineNames = (html: string, baseUrl: string): Set<string> => {
  const $ = cheerio.load(html);
  const names = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || !isCharacterProfileHref(href, baseUrl)) return;

    const textName = $(element).text().replace(/\s+/g, " ").trim();
    const name = textName || extractCharacterNameFromHref(href, baseUrl);
    if (name) names.add(name);
  });

  return names;
};

export const fetchOnlineCharacterNames = async (
  guildUrl: string,
  customHeaders?: Record<string, string>
): Promise<Set<string> | null> => {
  let origin: string;
  try {
    origin = new URL(guildUrl).origin;
  } catch {
    return null;
  }

  const serverId = extractServerIdFromUrl(guildUrl);
  const headers = customHeaders || createRequestHeaders(origin);
  const serverConfig = loadServerConfig(serverId);
  const orderedPaths = reorderPathsByLastWorking(ONLINE_LIST_CANDIDATE_PATHS, serverConfig?.lastWorkingOnlineListPath);

  let sawForbidden = false;

  for (const path of orderedPaths) {
    const candidateUrl = buildCandidateUrl(origin, path);
    const result = await fetchCandidate(candidateUrl, headers, serverId);
    if (result.statusCode === 403) sawForbidden = true;
    if (!result.html) continue;

    const names = extractOnlineNames(result.html, candidateUrl);
    if (names.size > 0) {
      await rememberWorkingOnlineListPath(serverId, path, serverConfig);
      return names;
    }
  }

  if (!sawForbidden) return null;

  for (const path of orderedPaths) {
    const candidateUrl = buildCandidateUrl(origin, path);
    const html = await playwrightManager.fetchPageContent(candidateUrl, serverId, headers);
    if (!html) continue;

    const names = extractOnlineNames(html, candidateUrl);
    if (names.size > 0) {
      await rememberWorkingOnlineListPath(serverId, path, serverConfig);
      return names;
    }
  }

  return null;
};
