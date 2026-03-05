import * as cheerio from "cheerio";
import type { GuildMember } from "@shared/types/index";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidPlayerName, GUILD_HEADERS } from "../utils/validators";
import { extractCharacterNameFromHref, isCharacterProfileHref } from "./characterLinkUtils";

export const scrapeNestedTableForm = ($: cheerio.CheerioAPI, baseUrl: string): GuildMember[] => {
  const members: GuildMember[] = [];
  const seen = new Set<string>();

  $("tbody tr td table tbody tr td form a[href]").each(
    (_, element) => {
      const $link = $(element);
      const href = $link.attr("href");
      if (!href || !isCharacterProfileHref(href, baseUrl)) return;

      const name = $link.text().trim() || extractCharacterNameFromHref(href, baseUrl);

      if (!name || seen.has(name)) return;
      if (!isValidPlayerName(name)) return;

      const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();

      members.push({ name, url: normalizeUrl(fullHref) });
      seen.add(name);
    }
  );

  if (members.length === 0) {
    $("tbody a[href]").each((_, element) => {
      const $link = $(element);
      const href = $link.attr("href");
      if (!href || !isCharacterProfileHref(href, baseUrl)) return;
      const name = $link.text().trim() || extractCharacterNameFromHref(href, baseUrl);

      const parentText = $link.parent().text().trim();

      if (!name || seen.has(name)) return;
      if (!isValidPlayerName(name)) return;
      if (GUILD_HEADERS.some((header) => parentText.includes(header))) return;

      const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();

      members.push({ name, url: normalizeUrl(fullHref) });
      seen.add(name);
    });
  }

  return members;
};
