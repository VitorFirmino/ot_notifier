import * as cheerio from "cheerio";
import type { GuildMember, GuildDiscovered } from "../../../shared/types/index";
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
  Array.from(new Map(members.map((member) => [member.name, member])).values());

export const extractGuildLogo = ($: cheerio.CheerioAPI, baseUrl: string): string | undefined => {
  const logoSelectors = [
    "img[src*='guild_image']",
    "img[src*='logo']",
    "img[src*='emblem']",
    "img[src*='guild']",
    "td[align='center'] > img",
  ];

  for (const selector of logoSelectors) {
    const src = $(selector).attr("src");
    if (src) {
      return src.startsWith("http") ? src : new URL(src, baseUrl).toString();
    }
  }

  return undefined;
};

const collapseDuplicateSlashes = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    return parsed.toString();
  } catch (err: unknown) {
    return url;
  }
};

export const discoverGuildsFromList = (html: string, baseUrl: string): GuildDiscovered[] => {
  const $ = cheerio.load(html);
  const guilds: GuildDiscovered[] = [];
  const seen = new Set<string>();
  const seenUrls = new Set<string>();

  const addGuild = (name: string, rawUrl: string, logoSrc?: string, kills?: string, world?: string) => {
    const cleanName = name.replace(/\(Nv:.*?\)/gi, "").trim();
    if (!cleanName || seen.has(cleanName)) return;

    let fullUrl = rawUrl;
    if (rawUrl && !rawUrl.startsWith("http")) {
      try {
        fullUrl = new URL(rawUrl, baseUrl).toString();
      } catch (err: unknown) {
        fullUrl = rawUrl;
      }
    }
    if (fullUrl) fullUrl = collapseDuplicateSlashes(fullUrl);

    if (fullUrl && seenUrls.has(fullUrl)) return;

    seen.add(cleanName);
    if (fullUrl) seenUrls.add(fullUrl);

    let fullLogo: string | undefined = undefined;
    if (logoSrc) {
      try {
        fullLogo = logoSrc.startsWith("http") ? logoSrc : new URL(logoSrc, baseUrl).toString();
      } catch (err: unknown) {
        fullLogo = logoSrc;
      }
      fullLogo = collapseDuplicateSlashes(fullLogo);
    }

    guilds.push({
      name: cleanName,
      url: fullUrl,
      logoUrl: fullLogo,
      kills,
      world,
    });
  };

  $("a[href*='action=view'], a[href*='GuildName']").each((_, elem) => {
    const $link = $(elem);
    const href = $link.attr("href") || "";
    const $img = $link.find("img[src*='guild_image'], img[src*='logo'], img[src*='emblem']");
    const logoSrc = $img.attr("src") || "";

    let rawName = $link.text().trim();
    if (!rawName && href.includes("GuildName=")) {
      try {
        const urlObj = new URL(href.startsWith("http") ? href : new URL(href, baseUrl).toString());
        rawName = decodeURIComponent(urlObj.searchParams.get("GuildName") || "").replace(/\+/g, " ");
      } catch (err: unknown) {
        rawName = "";
      }
    }

    const $container = $link.closest("td");
    const killsText = $container.find("span").first().text().trim() || undefined;
    const worldText = $container.find("font").text().trim() || undefined;

    if (href && rawName) {
      addGuild(rawName, href, logoSrc, killsText, worldText);
    }
  });

  $("tr").each((_, trElem) => {
    const $tr = $(trElem);
    const $img = $tr.find("img[src*='guild_image'], img[src*='logo'], img[src*='emblem']");
    const logoSrc = $img.attr("src");

    const $form = $tr.find("form[action*='guilds']");
    const inputGuildName = $tr.find("input[name='GuildName']").attr("value") || $tr.find("input[name='guild']").attr("value");
    const formAction = $form.attr("action") || "";

    let guildName = inputGuildName || $tr.find("b").first().text().trim();

    if (guildName && (logoSrc || formAction)) {
      let targetUrl = formAction;
      if (formAction && inputGuildName) {
        const urlObj = new URL(formAction.startsWith("http") ? formAction : new URL(formAction, baseUrl).toString());
        urlObj.searchParams.set("GuildName", inputGuildName);
        targetUrl = urlObj.toString();
      } else if (!targetUrl) {
        targetUrl = `?subtopic=guilds&action=view&GuildName=${encodeURIComponent(guildName)}`;
      }

      addGuild(guildName, targetUrl, logoSrc);
    }
  });

  const GENERIC_LINK_TEXT = new Set(["ver guild", "ver mais", "view", "visitar", "detalhes", ""]);

  $("a[href*='guilds/']").each((_, elem) => {
    const $link = $(elem);
    const href = $link.attr("href") || "";
    const match = href.match(/guilds\/([^"'?&#]+)/i);
    if (!match) return;

    let decodedName = "";
    try {
      decodedName = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
    } catch (err: unknown) {
      decodedName = match[1].replace(/\+/g, " ").trim();
    }
    if (!decodedName) return;

    const $card = $link.closest("td, div, li, tr");
    const cardNameText = $card.find(".card-name, .guild-name").first().text().trim();
    const linkText = $link.text().trim();
    const displayName =
      cardNameText || (!GENERIC_LINK_TEXT.has(linkText.toLowerCase()) ? linkText : decodedName);

    const logoSrc = $link.find("img").attr("src") || $card.find("img").first().attr("src");
    const killsMatch = $card.text().match(/(\d[\d.,]*)\s*kills?/i);
    const kills = killsMatch ? killsMatch[0].trim() : undefined;

    addGuild(displayName, href, logoSrc, kills);
  });

  $("[onclick*='guilds.php']").each((_, elem) => {
    const $el = $(elem);
    const onclick = $el.attr("onclick") || "";
    const match = onclick.match(/guilds\.php\?name=([^&"'\\]+)/i);
    if (!match) return;

    let decodedName = "";
    try {
      decodedName = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
    } catch (err: unknown) {
      decodedName = match[1].replace(/\+/g, " ").trim();
    }
    if (!decodedName) return;

    const displayName = $el.find(".guild-name, h3, b").first().text().trim() || decodedName;
    const logoSrc = $el.find("img").first().attr("src");
    const statsMatch = $el.text().match(/(\d[\d.,]*)\s*(?:kills?|members?)/i);
    const kills = statsMatch ? statsMatch[0].trim() : undefined;

    addGuild(displayName, `guilds.php?name=${encodeURIComponent(decodedName)}`, logoSrc, kills);
  });

  return guilds;
};

export const isGuildNotExistHtml = (html: string): boolean => {
  if (!html) return false;
  const lower = html.toLowerCase();
  return (
    /guild\s+with\s+name.*?doesn'?t\s+exist/i.test(lower) ||
    /guild.*?doesn'?t\s+exist/i.test(lower) ||
    /guild.*?does\s+not\s+exist/i.test(lower) ||
    /guild\s+not\s+found/i.test(lower) ||
    /guilda\s+n[ãa]o\s+encontrada/i.test(lower) ||
    /nossa guilda n[ãa]o existe/i.test(lower)
  );
};

export const getGuildMembers = async (
  guildUrl: string,
  customHeaders?: Record<string, string>
): Promise<GuildMember[]> => {
  const html = customHeaders
    ? await fetchGuildPageWithHeaders(guildUrl, customHeaders)
    : await fetchGuildPage(guildUrl);

  if (isGuildNotExistHtml(html)) {
    const match =
      html.match(/guild\s+with\s+name\s+<b>?([^<]+?)<\/b>?\s+doesn'?t\s+exist/i) ||
      html.match(/guild\s+with\s+name\s+([^<]+?)\s+doesn'?t\s+exist/i) ||
      html.match(/guild\s+([^<]+?)\s+doesn'?t\s+exist/i);
    const guildName = match ? match[1].trim() : "especificada";
    throw new Error(`Guild with name ${guildName} doesn't exist.`);
  }

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
