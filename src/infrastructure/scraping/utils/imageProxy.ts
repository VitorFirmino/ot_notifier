import axios from "axios";
import { createRequestHeaders } from "../http/axiosClient";
import { extractServerIdFromUrl } from "@shared/utils/serverIdentity";
import { playwrightManager } from "../playwrightManager";
import { assertPublicHttpUrl } from "@shared/utils/urlSafety";

export type ProxiedImage = {
  buffer: Buffer;
  contentType: string;
};

const IMAGE_FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECT_HOPS = 5;

type RawResponse = { data: ArrayBuffer; headers: Record<string, unknown>; status: number };

const fetchWithValidatedRedirects = async (
  url: string,
  origin: string,
  hopsLeft: number
): Promise<RawResponse | null> => {
  const response = await axios.get<ArrayBuffer>(url, {
    headers: createRequestHeaders(origin),
    timeout: IMAGE_FETCH_TIMEOUT_MS,
    responseType: "arraybuffer",
    maxRedirects: 0,
    validateStatus: (status) => status < 400,
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers["location"];
    if (!location || hopsLeft <= 0) return null;

    const nextUrl = new URL(String(location), url).toString();
    await assertPublicHttpUrl(nextUrl);
    return fetchWithValidatedRedirects(nextUrl, origin, hopsLeft - 1);
  }

  return { data: response.data, headers: response.headers, status: response.status };
};

export const fetchImageProxied = async (rawUrl: string): Promise<ProxiedImage | null> => {
  const origin = new URL(rawUrl).origin;
  const serverId = extractServerIdFromUrl(rawUrl);

  try {
    const result = await fetchWithValidatedRedirects(rawUrl, origin, MAX_REDIRECT_HOPS);
    if (result) {
      const contentType = String(result.headers["content-type"] || "");
      if (contentType.startsWith("image/")) {
        return { buffer: Buffer.from(result.data), contentType };
      }
    }
  } catch (err: unknown) {
    console.debug(`[${serverId || "default"}] Fetch direto de imagem falhou, tentando via browser:`, err);
  }

  const browserResult = await playwrightManager.fetchImageBytes(rawUrl, serverId, createRequestHeaders(origin));
  return browserResult;
};
