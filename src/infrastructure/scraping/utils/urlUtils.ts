export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    urlObj.hash = "";
    urlObj.pathname = urlObj.pathname.replace(/\/{2,}/g, "/");
    return urlObj.toString();
  } catch {
    return url;
  }
};

const SENSITIVE_SERVER_IDS = ["server1", "server2"];

export const isSensitiveServer = (serverId?: string): boolean =>
  !!serverId && SENSITIVE_SERVER_IDS.includes(serverId);
