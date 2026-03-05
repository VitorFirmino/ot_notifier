import { loadServerConfig, saveServerConfig } from "@infrastructure/storage/serverConfigManager";
import type { AxiosError } from "axios";

export const detectCloudflareFromResponse = (error: AxiosError | null): boolean => {
  if (!error || !error.response) return false;

  const headers = error.response.headers;
  const status = error.response.status;

  const hasCfHeaders =
    headers["cf-ray"] !== undefined ||
    headers["cf-mitigated"] !== undefined ||
    headers["cf-challenge"] !== undefined ||
    headers["cf-browser-verification"] !== undefined;

  if (status === 403 && hasCfHeaders) {
    return true;
  }

  if (headers["cf-mitigated"] === "challenge") {
    return true;
  }

  if (error.response.data && typeof error.response.data === "string") {
    const html = error.response.data.toLowerCase();
    const hasCloudflareContent =
      html.includes("cf-browser-verification") ||
      html.includes("ddos protection by cloudflare") ||
      html.includes("checking your browser") ||
      html.includes("um momento") ||
      html.includes("just a moment") ||
      html.includes("challenges.cloudflare.com") ||
      html.includes("cf-turnstile") ||
      html.includes("cf-challenge");

    if (hasCloudflareContent) {
      return true;
    }
  }

  return false;
};

export const detectCloudflareFromHtml = (html: string): boolean => {
  if (!html) return false;

  const htmlLower = html.toLowerCase();

  const indicators = [
    "cf-browser-verification",
    "ddos protection by cloudflare",
    "checking your browser",
    "um momento",
    "just a moment",
    "verificando",
    "challenges.cloudflare.com",
    "cf-turnstile",
    "cf-challenge",
    "cf-ray",
    "__cf_chl",
    "cf-chl-widget",
    "_cf_chl_opt",
    "challenge-platform",
  ];

  return indicators.some((indicator) => htmlLower.includes(indicator));
};

export const markServerAsCloudflare = async (serverId: string): Promise<void> => {
  const config = loadServerConfig(serverId);
  if (!config) return;

  if (config.hasCloudflare === true) return;

  const updatedConfig = {
    ...config,
    hasCloudflare: true,
    cloudflareDetectedAt: new Date().toISOString(),
  };

  await saveServerConfig(updatedConfig);
  console.log(
    `🛡️ [${serverId}] Servidor marcado como tendo Cloudflare (detectado automaticamente)`
  );
};

export const serverHasCloudflare = (serverId: string): boolean => {
  const config = loadServerConfig(serverId);
  if (!config) return false;

  if (config.hasCloudflare === true) return true;

  if (config.settings?.headers?.cookie?.includes("cf_clearance")) {
    return true;
  }

  return false;
};
