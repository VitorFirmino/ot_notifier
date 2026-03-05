import * as cheerio from "cheerio";
import type { GuildMember } from "@shared/types/index";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidPlayerName } from "../utils/validators";
import { extractCharacterNameFromHref, isCharacterProfileHref } from "./characterLinkUtils";

const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const isGuildListSectionTitle = (title: string): boolean => {
  const normalized = normalizeText(title).toLowerCase();

  const memberSectionPatterns = [
    /^guild members?$/,
    /^members?$/,
    /^membros?( da guild)?$/,
    /^miembros?( del guild)?$/,
  ];

  const invitedSectionPatterns = [
    /^invited characters?$/,
    /^invited players?$/,
    /^convidados?$/,
    /^personagens convidados?$/,
    /^invitados?$/,
    /^personajes invitados?$/,
  ];

  return [...memberSectionPatterns, ...invitedSectionPatterns].some((pattern) =>
    pattern.test(normalized)
  );
};

const buildMember = (
  href: string,
  name: string,
  baseUrl: string
): GuildMember | null => {
  const parsedName = normalizeText(name);
  if (!parsedName || parsedName.length <= 1) return null;
  if (!isValidPlayerName(parsedName)) return null;

  const fullHref = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
  const normalizedHref = normalizeUrl(fullHref);

  return { name: parsedName, url: normalizedHref };
};

const extractFromGuildMembersSection = (
  $: cheerio.CheerioAPI,
  baseUrl: string
): GuildMember[] => {
  const members: GuildMember[] = [];
  const seen = new Set<string>();

  const sections = $(".TableContainer").filter((_, el) => {
    const title = normalizeText($(el).find(".CaptionInnerContainer .Text").first().text());
    return isGuildListSectionTitle(title);
  });

  if (sections.length === 0) return members;

  sections.each((_, section) => {
    $(section)
      .find("a[href]")
      .each((__, element) => {
        const $link = $(element);
        const href = $link.attr("href");
        if (!href) return;
        if (!isCharacterProfileHref(href, baseUrl)) return;

        const nameFromText = normalizeText($link.text());
        const name = nameFromText || extractCharacterNameFromHref(href, baseUrl);
        if (!name || seen.has(name)) return;

        const member = buildMember(href, name, baseUrl);
        if (!member) return;

        members.push(member);
        seen.add(member.name);
      });
  });

  return members;
};

export const scrapeQueryParams = ($: cheerio.CheerioAPI, baseUrl: string): GuildMember[] => {
  const guildMembers = extractFromGuildMembersSection($, baseUrl);
  if (guildMembers.length > 0) return guildMembers;

  const members: GuildMember[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, element) => {
    const $link = $(element);
    const href = $link.attr("href");
    if (!href || !isCharacterProfileHref(href, baseUrl)) return;

    let name = normalizeText($link.text());

    if (!name) {
      name = extractCharacterNameFromHref(href, baseUrl);
    }

    if (!name || seen.has(name)) return;
    const member = buildMember(href, name, baseUrl);
    if (!member) return;

    members.push(member);
    seen.add(member.name);
  });

  return members;
};
