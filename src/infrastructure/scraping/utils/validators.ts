export const GUILD_HEADERS = ["Leader", "Vice-Leader", "Member"];

export const isValidGuildMember = (name: string, href: string | undefined): boolean =>
  !!(name && href);

export const isGuildHeader = (parentText: string): boolean =>
  GUILD_HEADERS.some((header) => parentText.includes(header));

export const isValidPlayerName = (name: string): boolean => {
  if (!name || name.length < 2) return false;
  if (name.length > 30) return false;
  if (/^\d+$/.test(name)) return false;
  if (/^[^a-zA-Z]/.test(name)) return false;
  return true;
};

export const isNavigationLink = (href: string): boolean => {
  if (!href) return true;
  return (
    href.includes("javascript:") ||
    href.includes("#") ||
    href.includes("mailto:") ||
    href.includes("tel:") ||
    href.includes(".css") ||
    href.includes(".js")
  );
};
