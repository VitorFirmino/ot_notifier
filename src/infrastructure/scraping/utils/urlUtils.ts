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

export const isSensitiveServer = (serverId?: string): boolean =>
  !!serverId &&
  (serverId === "server1" ||
    serverId === "server2" ||
    serverId.startsWith("server1_") ||
    serverId.startsWith("server2_"));
