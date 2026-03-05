import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { GuildMember } from "@shared/types/index";
import { normalizeUrl } from "../utils/urlUtils";
import { isValidGuildMember, isGuildHeader } from "../utils/validators";

export const parseGuildMember = (
  $: cheerio.CheerioAPI,
  element: AnyNode,
  baseUrl?: string
): GuildMember | null => {
  const $element = $(element);
  let href = $element.attr("href");
  const name = $element.text().trim();

  if (!isValidGuildMember(name, href)) return null;
  if (!href) return null;

  if (!href.startsWith("http")) {
    if (!baseUrl) {
      throw new Error("baseUrl é obrigatório para URLs relativas");
    }
    href = new URL(href, baseUrl).toString();
  }

  const normalizedHref = normalizeUrl(href);
  const parentText = $element.parent().text().trim();

  if (isGuildHeader(parentText)) return null;

  return { name, url: normalizedHref };
};
