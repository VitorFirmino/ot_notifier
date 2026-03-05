import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { DeathInfo } from "@shared/types/index";

const MAX_DEATHS = 10;
const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const hasValidDeathFields = ({
  deathText,
  hasLinks,
}: {
  deathText: string;
  hasLinks: boolean;
}): boolean => {
  const hasDeathVerb = /(eliminado|killed|died)/i.test(deathText);
  const hasLevel = /(nível|level)\s+\d+/i.test(deathText);
  const hasKillerPreposition = /\b(por|by)\b/i.test(deathText);

  return hasDeathVerb && hasLevel && (hasKillerPreposition || hasLinks);
};

const extractKillers = ($: cheerio.CheerioAPI, deathCell: cheerio.Cheerio<AnyNode>): string[] =>
  deathCell
    .find("a")
    .map((_index: number, element: AnyNode) => $(element).text().trim())
    .get()
    .filter(Boolean);

const parseDeathFromRow = ($: cheerio.CheerioAPI, row: ReturnType<typeof $>): DeathInfo | null => {
  const cells = row.find("td");
  if (cells.length < 2) return null;

  const timeText = row.find("td").first().text().trim();
  const deathCell = row.find("td").eq(1);
  const deathText = deathCell.text().trim();

  if (!deathText) return null;

  const hasLinks = deathCell.find("a").length > 0;
  if (!hasValidDeathFields({ deathText, hasLinks })) return null;

  const levelMatch = deathText.match(/(?:nível|level)\s+(\d+)/i);
  if (!levelMatch) return null;

  const level = parseInt(levelMatch[1], 10);
  if (isNaN(level) || level <= 0) return null;

  const killers = extractKillers($, deathCell);

  return {
    level,
    killers,
    deathText,
    time: timeText || undefined,
  };
};

export const extractAllDeaths = ($: cheerio.CheerioAPI): DeathInfo[] => {
  let allTables = $();

  const deathContainer = $(".TableContainer").filter((_, el) => {
    const title = normalizeText($(el).find(".CaptionInnerContainer .Text").first().text());
    const lowerTitle = title.toLowerCase();
    return lowerTitle === "deaths" || lowerTitle.includes("últimas mortes");
  });

  if (deathContainer.length > 0) {
    allTables = deathContainer.first().find("table");
  } else {
    const deathBar = $('div.bar:contains("Últimas mortes")');
    if (deathBar.length > 0) {
      allTables = deathBar.parent().find("table");
    }
  }

  if (allTables.length === 0) return [];

  const deaths: DeathInfo[] = [];

  allTables.each((_i, table) => {
    if (deaths.length >= MAX_DEATHS) return false;

    $(table)
      .find("tr")
      .each((__, rowElement) => {
        if (deaths.length >= MAX_DEATHS) return false;

        const death = parseDeathFromRow($, $(rowElement));
        if (death) deaths.push(death);
      });
  });

  return deaths.slice(0, MAX_DEATHS);
};

export const extractDeathInfo = ($: cheerio.CheerioAPI): DeathInfo | null => {
  const deaths = extractAllDeaths($);
  return deaths[0] ?? null;
};
