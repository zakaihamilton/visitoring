import { pool } from "@/db";

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY_HEADERS !== "true")
    return Response.json(
      { status: "not_ready", reason: "trusted_proxy_headers_required" },
      { status: 503 },
    );

  try {
    await pool.query("select 1");
    return Response.json({ status: "ready", database: "connected" });
  } catch {
    return Response.json({ status: "not_ready", database: "unavailable" }, { status: 503 });
  }
}
