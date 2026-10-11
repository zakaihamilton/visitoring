export const DEFAULT_COLLECTOR_RATE_LIMIT_MAX_EVENTS = 120;
export const MAX_COLLECTOR_RATE_LIMIT_MAX_EVENTS = 2_147_483_646;

export function collectorRateLimitConfigurationError(): string | null {
  const configured = process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
  if (configured === undefined) return null;
  if (!/^[1-9]\d*$/.test(configured)) {
    return "COLLECTOR_RATE_LIMIT_MAX_EVENTS must be a positive integer.";
  }
  const maximum = Number(configured);
  if (!Number.isSafeInteger(maximum) || maximum > MAX_COLLECTOR_RATE_LIMIT_MAX_EVENTS) {
    return `COLLECTOR_RATE_LIMIT_MAX_EVENTS must not exceed ${MAX_COLLECTOR_RATE_LIMIT_MAX_EVENTS}.`;
  }
  return null;
}

export function collectorRateLimitMaxEvents(): number {
  if (collectorRateLimitConfigurationError()) return DEFAULT_COLLECTOR_RATE_LIMIT_MAX_EVENTS;
  const configured = process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
  return configured === undefined ? DEFAULT_COLLECTOR_RATE_LIMIT_MAX_EVENTS : Number(configured);
}

export function allowsRateLimitCount(
  count: number,
  maxEvents = collectorRateLimitMaxEvents(),
): boolean {
  return count <= maxEvents;
}

export function isDoNotTrack(value: string | null): boolean {
  return value === "1";
}
