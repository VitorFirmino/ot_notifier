import * as cheerio from "cheerio";
import type { GuildMember } from "@shared/types/index";
import { detectHtmlStructure } from "../utils/htmlStructureDetector";
import { scrapeQueryParams } from "../scrapers/queryParamsScraper";
import { scrapeNestedTableForm } from "../scrapers/nestedTableFormScraper";
import { scrapeCharactersPath } from "../scrapers/charactersPathScraper";
import { scrapePathBased } from "../scrapers/pathBasedScraper";
import { extractCharacterNameFromHref, isCharacterProfileHref } from "../scrapers/characterLinkUtils";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidPlayerName } from "../utils/validators";
import { fetchGuildPage, fetchGuildPageWithHeaders } from "../http/guildFetcher";

type ScraperKey = "nested_table_form" | "query_params" | "characters_path" | "path_based";

const getAllScrapers = (): Record<
  ScraperKey,
  ($: cheerio.CheerioAPI, baseUrl: string) => GuildMember[]
> => {
  return {
    nested_table_form: scrapeNestedTableForm,
    query_params: scrapeQueryParams,
    characters_path: scrapeCharactersPath,
    path_based: scrapePathBased,
  };
};

const extractCharacterLinksCaseInsensitive = (
  $: cheerio.CheerioAPI,
  baseUrl: string
): GuildMember[] => {
  const members: GuildMember[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const $link = $(element);
    const href = $link.attr("href");
    if (!href) return;
    if (!isCharacterProfileHref(href, baseUrl)) return;

    const textName = $link.text().replace(/\s+/g, " ").trim();
    const parsedName = (textName || extractCharacterNameFromHref(href, baseUrl)).trim();

    if (!parsedName || !isValidPlayerName(parsedName) || seen.has(parsedName)) return;

    const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    members.push({ name: parsedName, url: normalizeUrl(fullHref) });
    seen.add(parsedName);
  });

  return members;
};

const dedupeMembers = (members: GuildMember[]): GuildMember[] =>
  Array.from(new Map(members.map((m) => [m.name, m])).values());

export const getGuildMembers = async (
  guildUrl: string,
  customHeaders?: Record<string, string>
): Promise<GuildMember[]> => {
  const html = customHeaders
    ? await fetchGuildPageWithHeaders(guildUrl, customHeaders)
    : await fetchGuildPage(guildUrl);
  const $ = cheerio.load(html);
  const baseUrl = guildUrl;

  const structureType = detectHtmlStructure($);
  const scrapers = getAllScrapers();

  const scraper = structureType in scrapers ? scrapers[structureType as ScraperKey] : undefined;
  const primaryMembers = scraper ? scraper($, baseUrl) : [];
  if (primaryMembers.length > 0) {
    return dedupeMembers(primaryMembers);
  }

  const fallbackMembers = dedupeMembers([
    ...scrapeNestedTableForm($, baseUrl),
    ...scrapeQueryParams($, baseUrl),
    ...scrapeCharactersPath($, baseUrl),
    ...scrapePathBased($, baseUrl),
    ...extractCharacterLinksCaseInsensitive($, baseUrl),
  ]);

  return fallbackMembers;
};
