import * as cheerio from "cheerio";

export const detectHtmlStructure = ($: cheerio.CheerioAPI): string => {
  if (
    $("tbody tr td table tbody tr td form a[href*='subtopic=characters&name=']").length > 0 ||
    $("tbody tr td table tbody tr td form a[href*='?characters/']").length > 0
  ) {
    return "nested_table_form";
  }

  if (
    $("a[href*='subtopic=characters&name=']").length > 0 ||
    $("a[href*='?characters/']").length > 0 ||
    $("a[href*='/characters?name=']").length > 0
  ) {
    return "query_params";
  }

  if (
    $("a[href*='/comunidade/procurarjogador/']").length > 0 ||
    $("a[href*='/comunidade/guilds/']").length > 0
  ) {
    return "path_based";
  }

  if ($("a[href*='/characters/']").length > 0) {
    return "characters_path";
  }

  if ($("a[href*='characterprofile']").length > 0) {
    return "characterprofile";
  }

  if ($("a[href*='/character/view/']").length > 0) {
    return "character_view";
  }

  if ($("table tbody tr a[href*='character']").length > 0) {
    return "table_tbody";
  }

  if ($("table tr a[href*='character']").length > 0) {
    return "table_direct";
  }

  if ($(".playerGuildBar").length > 0) {
    return "guild_bar";
  }

  if ($("a[href*='/player/']").length > 0 || $("a[href*='player=']").length > 0) {
    return "player_path";
  }

  if ($("a[href*='/member/']").length > 0 || $("a[href*='member=']").length > 0) {
    return "member_path";
  }

  if ($("a[href*='character']").length > 0) {
    return "generic_character";
  }

  if (
    $("div, span")
      .text()
      .match(/[A-Z][a-z]+ [A-Z][a-z]+/)
  ) {
    return "text_based";
  }

  return "unknown";
};
