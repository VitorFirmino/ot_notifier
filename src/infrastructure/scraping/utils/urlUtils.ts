export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.hash = "";
    urlObj.pathname = urlObj.pathname.replace(/\/{2,}/g, "/");
    return urlObj.toString();
  } catch (err: unknown) {
    return url;
  }
};

const toSafeSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const isSensitiveServer = (serverId?: string): boolean =>
  !!serverId &&
  (serverId === "server1" ||
    serverId === "server2" ||
    serverId.startsWith("server1_") ||
    serverId.startsWith("server2_"));

export const extractServerIdFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.toLowerCase().includes("otdbo.com.br")) {
      const guildName = urlObj.searchParams.get("GuildName") || urlObj.searchParams.get("guildname");
      if (guildName) {
        const guildSlug = toSafeSlug(guildName.replace(/\+/g, " "));
        if (guildSlug) {
          return `otdbo_${guildSlug}`;
        }
      }
    }

    const parts = hostname.split(".");
    const ignoredSubdomains = ["www", "m", "mobile", "api", "cdn"];
    const relevantParts = parts.filter((part) => part && !ignoredSubdomains.includes(part.toLowerCase()));
    const slug = toSafeSlug((relevantParts.length > 0 ? relevantParts : parts).join("_"));
    return slug || hostname;
  } catch (err: unknown) {
    return "default";
  }
};
