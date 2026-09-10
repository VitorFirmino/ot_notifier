import * as cheerio from "cheerio";
import { createRequestHeaders, fetchWithAxiosResult, type AxiosFetchResult } from "../http/axiosClient";
import { isCharacterProfileHref, extractCharacterNameFromHref } from "../scrapers/characterLinkUtils";
import { extractServerIdFromUrl } from "@shared/utils/serverIdentity";
import { playwrightManager } from "../playwrightManager";

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
  } catch (err: unknown) {
    return null;
  }

  const serverId = extractServerIdFromUrl(guildUrl);
  const headers = customHeaders || createRequestHeaders(origin);
  const candidates = ONLINE_LIST_CANDIDATE_PATHS.map((path) => buildCandidateUrl(origin, path));

  let sawForbidden = false;

  for (const candidateUrl of candidates) {
    const result = await fetchCandidate(candidateUrl, headers, serverId);
    if (result.statusCode === 403) sawForbidden = true;
    if (!result.html) continue;

    const names = extractOnlineNames(result.html, candidateUrl);
    if (names.size > 0) return names;
  }

  if (!sawForbidden) return null;

  for (const candidateUrl of candidates) {
    const html = await playwrightManager.fetchPageContent(candidateUrl, serverId, headers);
    if (!html) continue;

    const names = extractOnlineNames(html, candidateUrl);
    if (names.size > 0) return names;
  }

  return null;
};
