const GENERIC_LEADING_LABEL = /^(www|m|mobile|api|cdn|server\d+)$/i;

export const getSiteHostname = (url: string | undefined): string => {
  if (!url) return "";
  try {
    const labels = new URL(url).hostname.split(".");
    while (labels.length > 2 && GENERIC_LEADING_LABEL.test(labels[0])) {
      labels.shift();
    }
    return labels.join(".");
  } catch {
    return "";
  }
};
