import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function matchesSecret(expected: string, actual: string): boolean {
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  const actualDigest = createHash("sha256").update(actual, "utf8").digest();
  return timingSafeEqual(expectedDigest, actualDigest);
}

export function createSiteKey(): string {
  return `vk_${randomBytes(24).toString("base64url")}`;
}

export function hashRateLimitIp(ip: string): string {
  return hashRateLimitKey(`ip:${ip}`);
}

const RATE_LIMIT_SECRET_MIN_BYTES = 32;

export function rateLimitSecretConfigurationError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < RATE_LIMIT_SECRET_MIN_BYTES) {
    return "RATE_LIMIT_SECRET must contain at least 32 UTF-8 bytes in production.";
  }
  return null;
}

export function hashRateLimitKey(value: string): string {
  const configurationError = rateLimitSecretConfigurationError();
  if (configurationError) throw new Error(configurationError);
  const secret = process.env.RATE_LIMIT_SECRET || "visitoring-local-rate-limit";
  return createHmac("sha256", secret).update(value).digest("hex");
}
