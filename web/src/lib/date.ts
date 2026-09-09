const RAW_DATE_PATTERN = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/;

export const formatBrDate = (raw: string | undefined): string | undefined => {
  if (!raw) return raw;

  const match = raw.match(RAW_DATE_PATTERN);
  if (!match) return raw;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (Number.isNaN(date.getTime())) return raw;

  const datePart = date.toLocaleDateString("pt-BR");
  const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} às ${timePart}`;
};
