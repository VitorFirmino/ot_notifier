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
  const hasDeathVerb =
    /(eliminado|morreu|morto|faleceu|matou|matado|assassinado|died|killed|slain|frag(ged)?|murio|muri[oó]|muerto|asesinado)/i.test(
      deathText
    );
  const hasLevel = /(n[ií]vel|level|lvl)[:\s]+\d+/i.test(deathText);
  const hasKillerPreposition = /\b(por|by)\b/i.test(deathText);

  return hasLevel && (hasDeathVerb || hasKillerPreposition || hasLinks);
};

const extractKillers = ($: cheerio.CheerioAPI, deathCell: cheerio.Cheerio<AnyNode>): string[] =>
  deathCell
    .find("a")
    .map((_index: number, element: AnyNode) => $(element).text().trim())
    .get()
    .filter(Boolean);

const DEATH_HEADING_LABELS = [
  "character deaths",
  "deaths",
  "últimas mortes",
  "mortes do personagem",
  "muertes del personaje",
  "muertes",
];

const findTableAfterDeathHeading = ($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> => {
  const heading = $("h1, h2, h3, h4, h5, h6")
    .filter((_, el) => {
      const title = normalizeText($(el).text()).toLowerCase();
      return DEATH_HEADING_LABELS.some((label) => title.includes(label));
    })
    .first();

  if (heading.length === 0) return $();

  const allNodes = $("*").toArray();
  const headingIndex = allNodes.indexOf(heading[0]);
  if (headingIndex === -1) return $();

  const nextTable = allNodes.slice(headingIndex + 1).find((node) => "tagName" in node && node.tagName === "table");
  return nextTable ? $(nextTable) : $();
};

const parseDeathFromRow = ($: cheerio.CheerioAPI, row: ReturnType<typeof $>): DeathInfo | null => {
  const cells = row.children("td");
  if (cells.length < 2) return null;

  const timeText = cells.first().text().trim();
  const deathCell = cells.eq(1);
  const deathText = deathCell.text().trim();

  if (!deathText) return null;

  const hasLinks = deathCell.find("a").length > 0;
  if (!hasValidDeathFields({ deathText, hasLinks })) return null;

  const levelMatch = deathText.match(/(?:n[ií]vel|level)\s+(\d+)/i);
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
    return DEATH_HEADING_LABELS.some((label) => lowerTitle === label || lowerTitle.includes(label));
  });

  if (deathContainer.length > 0) {
    allTables = deathContainer.first().find("table");
  } else {
    const deathBar = $('div.bar:contains("Últimas mortes")');
    if (deathBar.length > 0) {
      allTables = deathBar.parent().find("table");
    }
  }

  if (allTables.length === 0) {
    const classicHeaderCell = $("td")
      .filter((_, el) => {
        const title = normalizeText($(el).text()).toLowerCase();
        return title === "character deaths" || title === "deaths" || title === "últimas mortes";
      })
      .first();
    if (classicHeaderCell.length > 0) {
      allTables = classicHeaderCell.closest("table");
    }
  }

  if (allTables.length === 0) {
    allTables = findTableAfterDeathHeading($);
  }

  if (allTables.length === 0) return [];

  allTables = allTables.filter((_, el) => $(el).find("table").length === 0);

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
