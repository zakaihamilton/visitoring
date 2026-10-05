import { pruneExpiredData, retentionCutoff } from "@/lib/retention";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cutoff = retentionCutoff();
    const result = await pruneExpiredData(cutoff);
    return Response.json({ cutoff: cutoff.toISOString(), ...result });
  } catch {
    return Response.json({ error: "Retention pruning failed" }, { status: 500 });
  }
}
