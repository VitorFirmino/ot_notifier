import * as cheerio from "cheerio";
import type { CharacterStatus, DeathInfo } from "@shared/types/index";
import { extractDeathInfo } from "./deathParser";

const OFFLINE_INDICATORS = ["status: offline", "offline"];
const normalizeText = (text: string): string => text.replace(/\s+/g, " ").trim();

const extractStatusFromNameField = ($: cheerio.CheerioAPI): boolean | null => {
  let foundStatus: boolean | null = null;

  $("tr, div, td").each((_i, el) => {
    if (foundStatus !== null) return;

    const text = normalizeText($(el).text());
    if (!/name\s*:/i.test(text)) return;

    if (/\(\s*offline\s*\)/i.test(text)) {
      foundStatus = false;
      return;
    }
    if (/\(\s*online\s*\)/i.test(text)) {
      foundStatus = true;
      return;
    }
  });

  if (foundStatus !== null) return foundStatus;

  $("td, th").each((_i, el) => {
    if (foundStatus !== null) return;

    const label = normalizeText($(el).text());
    if (!/^name\s*:?$/i.test(label)) return;

    const valueText = normalizeText($(el).next().text());
    if (/\(\s*offline\s*\)/i.test(valueText) || /\boffline\b/i.test(valueText)) {
      foundStatus = false;
      return;
    }
    if (/\(\s*online\s*\)/i.test(valueText) || /\bonline\b/i.test(valueText)) {
      foundStatus = true;
      return;
    }
  });

  return foundStatus;
};

const extractLevelFromField = ($: cheerio.CheerioAPI): number | null => {
  let foundLevel: number | null = null;

  $("td, th").each((_i, el) => {
    if (foundLevel !== null) return;

    const label = normalizeText($(el).text());
    if (!/^(level|nível)\s*:?$/i.test(label)) return;

    const valueText = normalizeText($(el).next().text());
    const match = valueText.match(/\b(\d{1,5})\b/);
    if (!match || !match[1]) return;

    const level = parseInt(match[1], 10);
    if (!isNaN(level) && level > 0 && level < 10000) {
      foundLevel = level;
    }
  });

  if (foundLevel !== null) return foundLevel;

  $("tr, div, p").each((_i, el) => {
    if (foundLevel !== null) return;

    const text = normalizeText($(el).text());
    const match = text.match(/(?:Level|Nível)\s*:\s*(\d{1,5})\b/i);
    if (!match || !match[1]) return;

    const level = parseInt(match[1], 10);
    if (!isNaN(level) && level > 0 && level < 10000) {
      foundLevel = level;
    }
  });

  return foundLevel;
};

export const extractLevel = ($: cheerio.CheerioAPI): number | null => {
  let foundLevel: number | null = null;
  $("h1.dib").each((_i, el) => {
    if (foundLevel) return;
    const text = $(el).text().trim();
    const levelMatch = text.match(/\((\d+)\)/);
    if (levelMatch && levelMatch[1]) {
      const level = parseInt(levelMatch[1], 10);
      if (!isNaN(level) && level > 0 && level < 10000) {
        foundLevel = level;
      }
    }
  });
  if (foundLevel) return foundLevel;

  foundLevel = extractLevelFromField($);
  if (foundLevel !== null) return foundLevel;

  foundLevel = null;
  $(".stat").each((_i, el) => {
    if (foundLevel) return;
    const text = $(el).text().trim();
    const levelMatch = text.match(/(?:Level|Nível)[:\s]+(\d+)/i);
    if (levelMatch && levelMatch[1]) {
      const level = parseInt(levelMatch[1], 10);
      if (!isNaN(level) && level > 0 && level < 10000) {
        foundLevel = level;
      }
    }
  });
  if (foundLevel) return foundLevel;

  const pageText = $("body").text();

  const levelPatterns = [
    /(?:Level|Nível)[:\s]+(\d+)/i,
    /(?:Level|Nível)\s*[:-]\s*(\d+)/i,
    /(?:Level|Nível)\s+(\d+)/i,
  ];

  const patternMatch = levelPatterns
    .map((pattern) => pageText.match(pattern))
    .find((match) => match && match[1]);

  if (patternMatch && patternMatch[1]) {
    const level = parseInt(patternMatch[1], 10);
    if (!isNaN(level) && level > 0 && level < 10000) return level;
  }

  foundLevel = null;
  $("td, th").each((_i, el) => {
    if (foundLevel) return;

    const text = $(el).text().trim();
    const levelMatch = text.match(/(?:Level|Nível)[:\s]+(\d+)/i);
    if (levelMatch && levelMatch[1]) {
      const level = parseInt(levelMatch[1], 10);
      if (!isNaN(level) && level > 0 && level < 10000) {
        foundLevel = level;
        return;
      }
    }

    if (text.toLowerCase().includes("level") || text.toLowerCase().includes("nível")) {
      const nextText = $(el).next().text().trim();
      const level = parseInt(nextText, 10);
      if (!isNaN(level) && level > 0 && level < 10000) {
        foundLevel = level;
        return;
      }
    }
  });
  if (foundLevel) return foundLevel;

  foundLevel = null;
  $("div, span, p").each((_i, el) => {
    if (foundLevel) return;

    const text = $(el).text().trim();
    const levelMatch = text.match(/(?:Level|Nível)[:\s]+(\d+)/i);
    if (levelMatch && levelMatch[1]) {
      const level = parseInt(levelMatch[1], 10);
      if (!isNaN(level) && level > 0 && level < 10000) {
        foundLevel = level;
        return;
      }
    }
  });
  if (foundLevel) return foundLevel;

  const words = pageText.split(/\s+/);
  const wordMatch = words
    .slice(0, -1)
    .map((word, i) => {
      const lowerWord = word.toLowerCase();
      if (lowerWord.includes("level") || lowerWord.includes("nível")) {
        const nextWord = words[i + 1]?.replace(/[^\d]/g, "") || "";
        if (nextWord) {
          const level = parseInt(nextWord, 10);
          if (!isNaN(level) && level > 0 && level < 10000) return level;
        }
      }
      return null;
    })
    .find((level) => level !== null);

  if (wordMatch) return wordMatch;

  const attrLevel =
    $("[data-level], [class*='level'], [id*='level']").first().attr("data-level") ||
    $("[class*='level']").first().attr("class")?.match(/(\d+)/)?.[1];
  if (attrLevel) {
    const level = parseInt(attrLevel, 10);
    if (!isNaN(level) && level > 0 && level < 10000) return level;
  }

  return null;
};

export const extractOnlineStatus = ($: cheerio.CheerioAPI): boolean => {
  const statusFromNameField = extractStatusFromNameField($);
  if (statusFromNameField !== null) return statusFromNameField;

  const onlineElement = $(".font-weight-bold.text-success").filter((_, el) => {
    const text = $(el).text().trim().toUpperCase();
    return text === "ONLINE" || text.includes("ONLINE");
  });
  if (onlineElement.length > 0) return true;

  const offlineElement = $(".font-weight-bold.text-danger").filter((_, el) => {
    const text = $(el).text().trim().toUpperCase();
    return text === "OFFLINE" || text.includes("OFFLINE");
  });
  if (offlineElement.length > 0) return false;

  let foundStatus: boolean | null = null;
  $(".stat").each((_i, el) => {
    if (foundStatus !== null) return;
    const text = $(el).text().trim().toLowerCase();
    if (text.includes("status:")) {
      const $el = $(el);
      const hasGreenSpan = $el.find('span[style*="green"], span[style*="#00"]').length > 0;
      const hasRedSpan = $el.find('span[style*="red"], span[style*="#f00"]').length > 0;

      if (hasRedSpan) {
        foundStatus = false;
        return;
      }
      if (hasGreenSpan) {
        foundStatus = true;
        return;
      }

      const combinedText = $el.text().toLowerCase();
      if (OFFLINE_INDICATORS.some((ind) => combinedText.includes(ind))) {
        foundStatus = false;
        return;
      }
      if (combinedText.includes("online") || combinedText.includes("conectado")) {
        foundStatus = true;
        return;
      }
    }
  });
  if (foundStatus !== null) return foundStatus;

  $("td").each((_i, el) => {
    if (foundStatus !== null) return;
    const text = $(el).text().trim();
    if (text.includes("Name:") || text.toLowerCase().includes("nome:")) {
      const $td = $(el);
      const $nextTd = $td.next("td");
      if ($nextTd.length > 0) {
        const hasGreenON =
          $nextTd.find('span[style*="green"]').filter((_, span) => {
            return $(span).text().trim().toUpperCase() === "ON";
          }).length > 0;
        const hasRedOFF =
          $nextTd.find('span[style*="red"]').filter((_, span) => {
            return $(span).text().trim().toUpperCase() === "OFF";
          }).length > 0;

        if (hasRedOFF) {
          foundStatus = false;
          return;
        }
        if (hasGreenON) {
          foundStatus = true;
          return;
        }

        const tdText = $nextTd.text().toLowerCase();
        if (tdText.includes("|off|") || tdText.match(/\|\s*off\s*\|/i)) {
          foundStatus = false;
          return;
        }
        if (tdText.includes("|on|") || tdText.match(/\|\s*on\s*\|/i)) {
          foundStatus = true;
          return;
        }
      }
    }
  });
  if (foundStatus !== null) return foundStatus;

  const pageText = $("body").text().toLowerCase();

  $("td, th, div, span, p").each((_i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.includes("status:")) {
      const nextText = $(el).next().text().trim().toLowerCase();
      const parentText = $(el).parent().text().toLowerCase();
      const combinedText = `${nextText} ${parentText}`;

      if (OFFLINE_INDICATORS.some((ind) => combinedText.includes(ind))) {
        return false;
      }
      if (combinedText.includes("online") || combinedText.includes("conectado")) {
        return true;
      }
    }
  });

  const offlinePatterns = [/status[:\s]*offline/i, /offline/i, /desconectado/i, /não\s+conectado/i];

  const onlinePatterns = [/status[:\s]*online/i, /online/i, /conectado/i, /está\s+online/i];

  const offlineMatch = offlinePatterns.find((pattern) => pattern.test(pageText));
  if (offlineMatch && !/não\s+está\s+offline/i.test(pageText)) {
    return false;
  }

  const onlineMatch = onlinePatterns.find((pattern) => pattern.test(pageText));
  if (onlineMatch && !/não\s+está\s+online/i.test(pageText)) {
    return true;
  }

  const onlineImages = $(
    'img[src*="online"], img[src*="green"], img[alt*="online"], img[class*="online"]'
  );
  const offlineImages = $(
    'img[src*="offline"], img[src*="red"], img[alt*="offline"], img[class*="offline"]'
  );

  if (offlineImages.length > 0) return false;
  if (onlineImages.length > 0) return true;

  const onlineClasses = $('[class*="online"], [class*="green"], [class*="connected"]');
  const offlineClasses = $('[class*="offline"], [class*="red"], [class*="disconnected"]');

  if (offlineClasses.length > 0) return false;
  if (onlineClasses.length > 0) return true;

  const greenElements = $('[style*="green"], [style*="#00"], [style*="rgb(0"]');
  const redElements = $('[style*="red"], [style*="#f00"], [style*="rgb(255,0"]');

  if (redElements.length > 0) return false;
  if (greenElements.length > 0) return true;

  return false;
};

export const parseCharacterFromHtml = (
  html: string,
  name: string,
  url: string
): CharacterStatus => {
  const $ = cheerio.load(html);
  const level = extractLevel($);
  const isOnline = extractOnlineStatus($);

  let lastDeath: DeathInfo | null = null;
  try {
    lastDeath = extractDeathInfo($);
  } catch {
    lastDeath = null;
  }

  return {
    name,
    url,
    level,
    isOnline,
    lastDeath: lastDeath ?? null,
  };
};
