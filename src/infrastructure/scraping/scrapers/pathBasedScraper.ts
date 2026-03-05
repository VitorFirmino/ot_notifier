import * as cheerio from "cheerio";
import type { GuildMember } from "@shared/types/index";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidPlayerName } from "../utils/validators";

export const scrapePathBased = ($: cheerio.CheerioAPI, baseUrl: string): GuildMember[] => {
  const members: GuildMember[] = [];
  const seen = new Set<string>();

  $("a[href*='/comunidade/procurarjogador/']").each((_, element) => {
    const $link = $(element);
    const href = $link.attr("href");
    const name = $link.text().trim();

    if (!name || !href || seen.has(name) || name.length <= 1) return;
    if (!isValidPlayerName(name)) return;

    const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();

    const normalizedHref = normalizeUrl(fullHref);
    members.push({ name, url: normalizedHref });
    seen.add(name);
  });

  return members;
};
