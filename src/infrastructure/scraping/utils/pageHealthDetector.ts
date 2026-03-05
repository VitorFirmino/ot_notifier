const normalize = (value: string): string => value.replace(/\s+/g, " ").trim().toLowerCase();

export const detectServerFatalPage = (html: string): string | null => {
  if (!html) return null;

  const text = normalize(html);

  const fatalPatterns: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /<b>\s*parse error\s*<\/b>/i, reason: "Parse error" },
    { pattern: /<b>\s*fatal error\s*<\/b>/i, reason: "Fatal error" },
    { pattern: /syntax error,\s*unexpected/i, reason: "Syntax error" },
    { pattern: /uncaught (exception|error)/i, reason: "Uncaught error" },
  ];

  const matched = fatalPatterns.find(({ pattern }) => pattern.test(text));
  return matched?.reason || null;
};
