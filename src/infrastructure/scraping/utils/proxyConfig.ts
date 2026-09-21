export type ProxyConfig = {
  server: string;
  username?: string;
  password?: string;
};

export const getProxyConfig = (): ProxyConfig | null => {
  const server = process.env.SCRAPING_PROXY_SERVER;
  if (!server) return null;

  return {
    server,
    username: process.env.SCRAPING_PROXY_USERNAME || undefined,
    password: process.env.SCRAPING_PROXY_PASSWORD || undefined,
  };
};

const DEFAULT_SESSION_LIFE_MINUTES = 25;

const getSessionLifeMinutes = (): number =>
  parseInt(process.env.SCRAPING_PROXY_SESSION_LIFE_MINUTES || String(DEFAULT_SESSION_LIFE_MINUTES), 10);

export const isStaticProxy = (): boolean => process.env.SCRAPING_PROXY_STATIC === "true";

export const getProxyConfigForSession = (sessionId: string): ProxyConfig | null => {
  const base = getProxyConfig();
  if (!base?.username) return base;
  if (isStaticProxy()) return base;

  return {
    ...base,
    username: `${base.username}_life-${getSessionLifeMinutes()}_session-${sessionId}`,
  };
};

export type AxiosProxyConfig = {
  protocol: string;
  host: string;
  port: number;
  auth?: { username: string; password: string };
};

export const getAxiosProxyConfig = (sessionId?: string): AxiosProxyConfig | null => {
  const proxy = sessionId ? getProxyConfigForSession(sessionId) : getProxyConfig();
  if (!proxy) return null;

  const parsed = new URL(proxy.server);

  return {
    protocol: parsed.protocol.replace(":", "") || "http",
    host: parsed.hostname,
    port: Number(parsed.port) || 80,
    auth:
      proxy.username && proxy.password
        ? { username: proxy.username, password: proxy.password }
        : undefined,
  };
};
