import { createRequestHeaders, fetchWithAxiosResult, type AxiosFetchResult } from "../http/axiosClient";
import { discoverGuildsFromList, detectWorldSelector, isGuildNotExistHtml } from "../parsers/guildParser";
import { extractServerIdFromUrl } from "@shared/utils/serverIdentity";
import { playwrightManager } from "../playwrightManager";
import { detectLoginRequiredPage, LoginRequiredError } from "./loginRequiredDetector";
import { getSiteCredential } from "@infrastructure/storage/siteCredentials";
import type { GuildDiscovered, WorldOption } from "../../../shared/types/index";

const CANDIDATE_TIMEOUT_MS = 8000;
const DISCOVERY_BUDGET_MS = 75000;
const BROWSER_PROBE_TIMEOUTS = { gotoTimeoutMs: 15000, networkIdleTimeoutMs: 5000 };

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

const CANDIDATE_PATHS = [
  "?subtopic=guilds",
  "/index.php?subtopic=guilds",
  "/index.php/guilds",
  "?view=guilds",
  "/community/guilds",
  "/guilds.php",
  "/guilds",
  "?subtopic=guildlist",
  "/",
];

const buildCandidateUrl = (origin: string, path: string): string =>
  path.startsWith("?") ? `${origin}/${path}` : `${origin}${path}`;

export type GuildRouteDiscoveryResult = {
  guilds: GuildDiscovered[];
  html: string;
  resolvedUrl: string;
  worldOptions?: WorldOption[];
};

type CandidateOutcome =
  | { kind: "success"; guilds: GuildDiscovered[]; html: string; url: string }
  | { kind: "weak"; guilds: GuildDiscovered[]; html: string; url: string }
  | { kind: "fetched-empty"; html: string; url: string }
  | { kind: "failed" };

const MIN_CONFIDENT_GUILD_COUNT = 2;

export const normalizeBaseUrl = (rawUrl: string): string =>
  /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

const evaluateCandidateHtml = (html: string | null, candidateUrl: string): CandidateOutcome => {
  if (!html) return { kind: "failed" };
  if (isGuildNotExistHtml(html)) return { kind: "fetched-empty", html, url: candidateUrl };

  const guilds = discoverGuildsFromList(html, candidateUrl);
  if (guilds.length >= MIN_CONFIDENT_GUILD_COUNT) return { kind: "success", guilds, html, url: candidateUrl };
  if (guilds.length > 0) return { kind: "weak", guilds, html, url: candidateUrl };

  return { kind: "fetched-empty", html, url: candidateUrl };
};

export const discoverGuildRoute = async (rawUrl: string, userId?: string): Promise<GuildRouteDiscoveryResult> => {
  const normalized = normalizeBaseUrl(rawUrl);
  const origin = new URL(normalized).origin;
  const serverId = extractServerIdFromUrl(normalized);

  const candidates = [normalized, ...CANDIDATE_PATHS.map((path) => buildCandidateUrl(origin, path))];
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  type PassSummary = {
    confident: GuildRouteDiscoveryResult | null;
    weakMatch: { guilds: GuildDiscovered[]; html: string; url: string } | null;
    lastFetched: { html: string; url: string } | null;
    lastErrorCode: string | null;
    sawForbidden: boolean;
    loginRequired: { domain: string; loginUrl: string } | null;
    worldOptions: WorldOption[] | null;
  };

  const deadline = Date.now() + DISCOVERY_BUDGET_MS;

  const runPass = async (
    fetchOne: (candidateUrl: string) => Promise<{ html: string | null; statusCode?: number | null; errorCode?: string }>,
    candidateUrls: string[]
  ): Promise<PassSummary> => {
    const summary: PassSummary = {
      confident: null,
      weakMatch: null,
      lastFetched: null,
      lastErrorCode: null,
      sawForbidden: false,
      loginRequired: null,
      worldOptions: null,
    };

    for (const candidateUrl of candidateUrls) {
      if (Date.now() >= deadline) break;

      const result = await fetchOne(candidateUrl);

      if (!result.html) {
        summary.lastErrorCode = result.errorCode || (result.statusCode ? `status ${result.statusCode}` : summary.lastErrorCode);
        if (result.statusCode === 403) summary.sawForbidden = true;

        if (result.statusCode === null) break;

        continue;
      }

      let html = result.html;
      const loginUrl = detectLoginRequiredPage(html, candidateUrl);
      if (loginUrl) {
        const domain = new URL(candidateUrl).hostname;
        const credential = userId ? await getSiteCredential(userId, domain) : null;
        if (credential) {
          const loggedIn = await playwrightManager.performLogin(
            credential.loginUrl,
            credential.username,
            credential.password
          );
          if (loggedIn) {
            const retryResult = await fetchOne(candidateUrl);
            if (retryResult.html) html = retryResult.html;
          }
        }

        if (detectLoginRequiredPage(html, candidateUrl)) {
          summary.loginRequired = summary.loginRequired || { domain, loginUrl };
          continue;
        }
      }

      const outcome = evaluateCandidateHtml(html, candidateUrl);
      if (outcome.kind === "success") {
        summary.confident = { guilds: outcome.guilds, html: outcome.html, resolvedUrl: outcome.url };
        return summary;
      }
      if (outcome.kind === "weak" && !summary.weakMatch) {
        summary.weakMatch = { guilds: outcome.guilds, html: outcome.html, url: outcome.url };
      }
      if (outcome.kind === "fetched-empty") {
        summary.lastFetched = { html: outcome.html, url: outcome.url };
        if (!summary.worldOptions) {
          summary.worldOptions = detectWorldSelector(outcome.html);
        }
      }
    }
    return summary;
  };

  const axiosPass = await runPass(
    (candidateUrl) => fetchCandidate(candidateUrl, createRequestHeaders(origin), serverId),
    uniqueCandidates
  );
  if (axiosPass.confident) return axiosPass.confident;

  let weakMatch = axiosPass.weakMatch;
  let lastFetched = axiosPass.lastFetched;
  let lastErrorCode = axiosPass.lastErrorCode;
  let loginRequired = axiosPass.loginRequired;
  let worldOptions = axiosPass.worldOptions;

  if (axiosPass.sawForbidden) {
    const browserPass = await runPass(
      async (candidateUrl) => ({
        html: await playwrightManager.fetchPageContent(
          candidateUrl,
          serverId,
          createRequestHeaders(origin),
          BROWSER_PROBE_TIMEOUTS
        ),
      }),
      uniqueCandidates
    );
    if (browserPass.confident) return browserPass.confident;

    weakMatch = weakMatch || browserPass.weakMatch;
    lastFetched = browserPass.lastFetched || lastFetched;
    lastErrorCode = browserPass.lastErrorCode || lastErrorCode;
    loginRequired = loginRequired || browserPass.loginRequired;
    worldOptions = worldOptions || browserPass.worldOptions;
  }

  if (weakMatch) {
    return { guilds: weakMatch.guilds, html: weakMatch.html, resolvedUrl: weakMatch.url };
  }

  if (lastFetched) {
    return {
      guilds: [],
      html: lastFetched.html,
      resolvedUrl: lastFetched.url,
      worldOptions: worldOptions || undefined,
    };
  }

  if (loginRequired) {
    throw new LoginRequiredError(loginRequired.domain, loginRequired.loginUrl);
  }

  throw new Error(
    lastErrorCode
      ? `Não foi possível acessar o servidor (${lastErrorCode})`
      : "Não foi possível acessar o servidor"
  );
};

export const discoverGuildsForWorld = async (
  rawUrl: string,
  worldValue: string
): Promise<GuildRouteDiscoveryResult> => {
  const normalized = normalizeBaseUrl(rawUrl);
  const origin = new URL(normalized).origin;
  const serverId = extractServerIdFromUrl(normalized);

  const candidates = [normalized, ...CANDIDATE_PATHS.map((path) => buildCandidateUrl(origin, path))];
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  let weakMatch: { guilds: GuildDiscovered[]; html: string; url: string } | null = null;
  const deadline = Date.now() + DISCOVERY_BUDGET_MS;

  for (const candidateUrl of uniqueCandidates) {
    if (Date.now() >= deadline) break;

    const html = await playwrightManager.selectWorldAndFetch(
      candidateUrl,
      worldValue,
      serverId,
      createRequestHeaders(origin),
      BROWSER_PROBE_TIMEOUTS
    );
    if (!html) continue;

    const outcome = evaluateCandidateHtml(html, candidateUrl);
    if (outcome.kind === "success") {
      return { guilds: outcome.guilds, html: outcome.html, resolvedUrl: outcome.url };
    }
    if (outcome.kind === "weak" && !weakMatch) {
      weakMatch = { guilds: outcome.guilds, html: outcome.html, url: outcome.url };
    }
  }

  if (weakMatch) {
    return { guilds: weakMatch.guilds, html: weakMatch.html, resolvedUrl: weakMatch.url };
  }

  throw new Error("Nenhuma guilda encontrada para o mundo selecionado.");
};
