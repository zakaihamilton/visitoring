import { isIP } from "node:net";

const visitorIdPattern = /^[A-Za-z0-9_-]{8,64}$/;

export function cleanPath(input: string): string {
  try {
    const pathname = new URL(input, "https://visitoring.invalid").pathname;
    return pathname.slice(0, 1024) || "/";
  } catch {
    return "/";
  }
}

export function cleanReferrerHost(input: string | undefined): string | null {
  if (!input) return null;
  try {
    const candidate = input.includes("://")
      ? new URL(input).hostname
      : input.split("/")[0]?.split(":")[0];
    const host = candidate?.trim().toLowerCase().replace(/\.$/, "");
    if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && visitorIdPattern.test(value);
}

export function clientIpFromHeaders(headers: Pick<Headers, "get">): string {
  const trustProxyHeaders =
    process.env.TRUST_PROXY_HEADERS === "true" || process.env.NODE_ENV !== "production";
  if (!trustProxyHeaders) return "unknown";

  const realIp = headers.get("x-real-ip");
  if (realIp !== null) {
    const address = realIp.trim();
    return isIP(address) ? address : "unknown";
  }
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const address = forwarded.trim();
  return isIP(address) ? address : "unknown";
}

export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
