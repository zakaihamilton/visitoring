import { getPool } from "@/db";
import { collectorRateLimitConfigurationError } from "@/lib/collection-policy";
import { rateLimitSecretConfigurationError } from "@/lib/crypto";

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY_HEADERS !== "true")
    return Response.json(
      { status: "not_ready", reason: "trusted_proxy_headers_required" },
      { status: 503 },
    );

  if (rateLimitSecretConfigurationError())
    return Response.json(
      { status: "not_ready", reason: "rate_limit_secret_invalid" },
      { status: 503 },
    );

  if (collectorRateLimitConfigurationError())
    return Response.json(
      { status: "not_ready", reason: "collector_rate_limit_invalid" },
      { status: 503 },
    );

  try {
    const pool = await getPool();
    await pool.query("select 1");
    return Response.json({ status: "ready", database: "connected" });
  } catch {
    return Response.json({ status: "not_ready", database: "unavailable" }, { status: 503 });
  }
}
