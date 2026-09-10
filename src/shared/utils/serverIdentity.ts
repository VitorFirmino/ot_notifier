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
    return toSafeSlug(cleanHostname) || cleanHostname;
  } catch (err: unknown) {
    return "unknown";
  }
};
