const toSafeSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeServerId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

const GUILD_NAME_QUERY_KEYS = ["GuildName", "guildname", "guild_name", "guild"];

const extractGuildToken = (urlObj: URL): string | null => {
  for (const key of GUILD_NAME_QUERY_KEYS) {
    const value = urlObj.searchParams.get(key);
    if (value) {
      const slug = toSafeSlug(value.replace(/\+/g, " "));
      if (slug) return slug;
    }
  }

  const pathGuildMatch = urlObj.pathname.match(/guilds?\/(?:view\/)?(\d+)/i);
  if (pathGuildMatch) {
    return pathGuildMatch[1];
  }

  return null;
};

export const extractServerIdFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes("otdbo.com.br")) {
      const guildName = urlObj.searchParams.get("GuildName") || urlObj.searchParams.get("guildname");
      if (guildName) {
        const guildSlug = toSafeSlug(guildName.replace(/\+/g, " "));
        if (guildSlug) {
          return `otdbo_${guildSlug}`;
        }
      }
    }

    const cleanHostname = hostname.replace(/^www\./, "");
    const hostSlug = toSafeSlug(cleanHostname) || cleanHostname;

    const guildToken = extractGuildToken(urlObj);
    if (guildToken) {
      return `${hostSlug}_${guildToken}`;
    }

    return hostSlug;
  } catch {
    return "unknown";
  }
};
