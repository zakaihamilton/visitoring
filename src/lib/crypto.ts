import { createHash, createHmac, randomBytes } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSiteKey(): string {
  return `vk_${randomBytes(24).toString("base64url")}`;
}

export function hashRateLimitIp(ip: string): string {
  return hashRateLimitKey(`ip:${ip}`);
}

export function hashRateLimitKey(value: string): string {
  const secret = process.env.RATE_LIMIT_SECRET ?? "visitoring-local-rate-limit";
  return createHmac("sha256", secret).update(value).digest("hex");
}
