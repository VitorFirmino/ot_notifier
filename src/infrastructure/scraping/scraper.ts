import * as cheerio from "cheerio";
import { getCharacterStatus } from "./http/characterFetcher";
import { getGuildMembers } from "./parsers/guildParser";
import { extractAllDeaths } from "./parsers/deathParser";

export { getCharacterStatus, getGuildMembers };

export const getAllDeaths = (html: string) => {
  const $ = cheerio.load(html);
  return extractAllDeaths($);
};
