import * as cheerio from "cheerio";
import type { GuildMember } from "@shared/types/index";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidPlayerName } from "../utils/validators";
import { extractCharacterNameFromHref, isCharacterProfileHref } from "./characterLinkUtils";

export const scrapeCharactersPath = ($: cheerio.CheerioAPI, baseUrl: string): GuildMember[] => {
  const members: GuildMember[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const $link = $(element);
    const href = $link.attr("href");
    if (!href || !isCharacterProfileHref(href, baseUrl)) return;

    const name = $link.text().trim() || extractCharacterNameFromHref(href, baseUrl);

    if (!name || seen.has(name) || name.length <= 1) return;
    if (!isValidPlayerName(name)) return;

    const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();

    const normalizedHref = normalizeUrl(fullHref);
    members.push({ name, url: normalizedHref });
    seen.add(name);
  });

  return members;
};
