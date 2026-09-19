const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/\+/g, " ");
  }
};

const getSearchParamCaseInsensitive = (url: URL, key: string): string | null => {
  const target = key.toLowerCase();
  for (const [paramKey, paramValue] of url.searchParams.entries()) {
    if (paramKey.toLowerCase() === target) {
      return paramValue;
    }
  }
  return null;
};

const getResolvedUrl = (href: string, baseUrl: string): URL | null => {
  try {
    return new URL(href, baseUrl);
  } catch {
    return null;
  }
};

const isCharactersRouteParam = (resolved: URL): boolean => {
  const subtopic = (getSearchParamCaseInsensitive(resolved, "subtopic") || "").toLowerCase();
  const view = (getSearchParamCaseInsensitive(resolved, "view") || "").toLowerCase();
  return subtopic === "characters" || view === "characters";
};

export const extractCharacterNameFromHref = (href: string, baseUrl: string): string => {
  const resolved = getResolvedUrl(href, baseUrl);
  if (!resolved) return "";

  const nameParam = getSearchParamCaseInsensitive(resolved, "name");

  if (isCharactersRouteParam(resolved) && nameParam) {
    return normalizeText(safeDecode(nameParam));
  }

  if (/\/characters$/i.test(resolved.pathname) && nameParam) {
    return normalizeText(safeDecode(nameParam));
  }

  const pathMatch = resolved.pathname.match(/(?:^|\/)characters\/([^/?#&]+)/i);
  if (pathMatch?.[1]) {
    return normalizeText(safeDecode(pathMatch[1]));
  }

  const searchRouteMatch = resolved.search.match(/(?:^|[?&])characters\/([^&?#]+)/i);
  if (searchRouteMatch?.[1]) {
    return normalizeText(safeDecode(searchRouteMatch[1]));
  }

  const viewPathMatch = resolved.pathname.match(/(?:^|\/)character\/view\/([^/?#&]+)/i);
  if (viewPathMatch?.[1]) {
    return normalizeText(safeDecode(viewPathMatch[1]));
  }

  return "";
};

export const isCharacterProfileHref = (href: string, baseUrl: string): boolean => {
  const resolved = getResolvedUrl(href, baseUrl);
  if (!resolved) return false;

  const name = extractCharacterNameFromHref(href, baseUrl);
  if (!name) return false;

  if (isCharactersRouteParam(resolved)) return true;

  if (/\/characters$/i.test(resolved.pathname) && getSearchParamCaseInsensitive(resolved, "name")) {
    return true;
  }

  if (/(?:^|\/)characters\/[^/?#&]+/i.test(resolved.pathname)) return true;
  if (/(?:^|[?&])characters\/[^&?#]+/i.test(resolved.search)) return true;
  if (/(?:^|\/)character\/view\/[^/?#&]+/i.test(resolved.pathname)) return true;

  return false;
};
