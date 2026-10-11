import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PERMINISTER_SSO_COOKIE_PREFIX =
  process.env.NODE_ENV === "production" ? "__Host-visitoring-sso-" : "visitoring_sso-";

export function perministerSsoCookieName(state: string): string | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
  return `${PERMINISTER_SSO_COOKIE_PREFIX}${state}`;
}

type PerministerSsoTransaction = {
  state: string;
  verifier: string;
  organizationId: string;
};

export function createPerministerSsoTransaction(organizationId: string) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  return {
    state,
    verifier,
    organizationId,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function sealPerministerSsoTransaction(
  transaction: PerministerSsoTransaction,
  clientSecret: string,
): string {
  const payload = Buffer.from(JSON.stringify(transaction), "utf8").toString("base64url");
  const signature = createHmac("sha256", clientSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readPerministerSsoTransaction(
  value: string | undefined,
  clientSecret: string,
): PerministerSsoTransaction | null {
  if (!value || value.length > 700) return null;
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length) return null;
  const expected = createHmac("sha256", clientSecret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      state?: unknown;
      verifier?: unknown;
      organizationId?: unknown;
    };
    if (
      typeof parsed.state !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(parsed.state) ||
      typeof parsed.verifier !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(parsed.verifier) ||
      typeof parsed.organizationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        parsed.organizationId,
      )
    ) {
      return null;
    }
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      organizationId: parsed.organizationId.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function matchesPerministerSsoState(expected: string, actual: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(actual)) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}
