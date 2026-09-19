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

export const buildProxyConfigFromEndpoint = (host: string, port: number): ProxyConfig => ({
  server: `http://${host}:${port}`,
});

export type AxiosProxyConfig = {
  protocol: string;
  host: string;
  port: number;
  auth?: { username: string; password: string };
};

export const getAxiosProxyConfig = (): AxiosProxyConfig | null => {
  const proxy = getProxyConfig();
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
