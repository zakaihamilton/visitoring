import { createHash, createHmac, randomBytes } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function createSiteKey(): string {
  return `vk_${randomBytes(24).toString("base64url")}`;
}

export function hashRateLimitIp(ip: string): string {
  return hashRateLimitKey(`ip:${ip}`);
}

export function hashRateLimitKey(value: string): string {
  const secret =
    process.env.RATE_LIMIT_SECRET ?? process.env.AUTH_SECRET ?? "visitoring-local-rate-limit";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashSessionToken(token: string): string {
  const secret = process.env.AUTH_SECRET ?? "visitoring-local-session";
  return createHmac("sha256", secret).update(token).digest("hex");
}
