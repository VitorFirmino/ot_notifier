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

export const extractCharacterNameFromHref = (href: string, baseUrl: string): string => {
  const resolved = getResolvedUrl(href, baseUrl);
  if (!resolved) return "";

  const subtopic = (getSearchParamCaseInsensitive(resolved, "subtopic") || "").toLowerCase();
  const nameParam = getSearchParamCaseInsensitive(resolved, "name");

  if (subtopic === "characters" && nameParam) {
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

  return "";
};

export const isCharacterProfileHref = (href: string, baseUrl: string): boolean => {
  const resolved = getResolvedUrl(href, baseUrl);
  if (!resolved) return false;

  const name = extractCharacterNameFromHref(href, baseUrl);
  if (!name) return false;

  const subtopic = (getSearchParamCaseInsensitive(resolved, "subtopic") || "").toLowerCase();
  if (subtopic === "characters") return true;

  if (/\/characters$/i.test(resolved.pathname) && getSearchParamCaseInsensitive(resolved, "name")) {
    return true;
  }

  if (/(?:^|\/)characters\/[^/?#&]+/i.test(resolved.pathname)) return true;
  if (/(?:^|[?&])characters\/[^&?#]+/i.test(resolved.search)) return true;

  return false;
};
