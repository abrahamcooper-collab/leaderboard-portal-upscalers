/** First day of a month as `YYYY-MM-01`, the format stored in Postgres. */
export type MonthStart = `${number}-${string}-01`;

/** The month that `now` falls in, as seen from `timeZone`. */
export function monthStartIn(timeZone: string, now: Date = new Date()): MonthStart {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) {
    throw new Error(`Could not resolve month for time zone ${timeZone}`);
  }
  return `${Number(year)}-${month}-01`;
}

/** e.g. "October 2026". */
export function formatMonth(month: MonthStart): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1)),
  );
}
