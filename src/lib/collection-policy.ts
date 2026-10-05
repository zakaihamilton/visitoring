const RATE_LIMIT_MAX_EVENTS = 120;

export function allowsRateLimitCount(count: number): boolean {
  return count <= RATE_LIMIT_MAX_EVENTS;
}

export function isDoNotTrack(value: string | null): boolean {
  return value === "1";
}
