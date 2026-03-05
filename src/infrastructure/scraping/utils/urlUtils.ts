export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.hash = "";
    return urlObj.toString();
  } catch {
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
    for (const part of parts) {
      if (part && !ignoredSubdomains.includes(part.toLowerCase())) {
        return part;
      }
    }
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return hostname;
  } catch {
    return "default";
  }
};
