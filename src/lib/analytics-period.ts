const DAY = 86_400_000;
export type Metrics = {
  total: number;
  visitors: number;
  sessions: number;
  pageViews: number;
  customEvents: number;
};
export const emptyMetrics: Metrics = {
  total: 0,
  visitors: 0,
  sessions: 0,
  pageViews: 0,
  customEvents: 0,
};
type Granularity = "hour" | "day" | "week" | "month";

function dateOr(input: string | undefined, fallback: string) {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return fallback;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input
    ? fallback
    : input;
}

export function dashboardDates(from: string | undefined, to: string | undefined, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.parse(today) - 29 * DAY).toISOString().slice(0, 10);
  const normalizedFrom = dateOr(from, defaultFrom);
  const normalizedTo = dateOr(to, today);
  const fromDate = normalizedFrom > today ? today : normalizedFrom;
  const toDate = normalizedTo > today ? today : normalizedTo;
  return {
    from: fromDate,
    to: toDate,
    error: fromDate > toDate ? "Start date must be on or before the end date." : "",
  };
}

export function analyticsPeriod(from: string, to: string, now = new Date()) {
  const start = new Date(from);
  const firstDay = new Date(start);
  firstDay.setUTCHours(0, 0, 0, 0);
  const lastDay = new Date(to);
  lastDay.setUTCHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / DAY) + 1);
  const requestedEnd = new Date(to).getTime() + 1;
  const includesNow = start.getTime() <= now.getTime() && requestedEnd > now.getTime();
  const end = new Date(includesNow ? now.getTime() : requestedEnd);
  const shift = days * DAY;
  const previousFrom = new Date(start.getTime() - shift);
  const previousTo = new Date(end.getTime() - shift);
  const granularity: Granularity =
    days === 1 ? "hour" : days <= 90 ? "day" : days <= 365 ? "week" : "month";
  const buckets: Array<{ from: string; to: string; previousFrom: string; previousTo: string }> = [];
  for (let cursor = start.getTime(); cursor < end.getTime(); ) {
    const nextMonth = new Date(cursor);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    const next = Math.min(
      end.getTime(),
      granularity === "month"
        ? nextMonth.getTime()
        : cursor + (granularity === "hour" ? DAY / 24 : granularity === "week" ? 7 * DAY : DAY),
    );
    buckets.push({
      from: new Date(cursor).toISOString(),
      to: new Date(next).toISOString(),
      previousFrom: new Date(cursor - shift).toISOString(),
      previousTo: new Date(next - shift).toISOString(),
    });
    cursor = next;
  }
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    previousFrom: previousFrom.toISOString(),
    previousTo: previousTo.toISOString(),
    partial: includesNow,
    granularity,
    buckets,
  };
}

export function metricChange(current: number, previous: number) {
  if (current === previous) return "No change";
  if (!previous) return "No previous activity";
  const percent = ((current - previous) / previous) * 100;
  return `${percent > 0 ? "+" : ""}${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(percent)}%`;
}

export function dateLabel(value: string, hourly = false, includeYear = false) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
    day: "numeric",
    ...(hourly ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(new Date(value));
}
