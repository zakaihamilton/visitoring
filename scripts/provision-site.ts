import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { sites, workspaces } from "@/db/schema";
import { createSiteKey, sha256 } from "@/lib/crypto";
import { parseAllowedDomains } from "@/lib/domains";
import { parseArgs, requiredArg } from "./args";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const workspaceId = requiredArg(args, "workspace-id");
  const name = requiredArg(args, "name");
  const domains = parseAllowedDomains(requiredArg(args, "domains"));
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error(`Workspace ${workspaceId} was not found.`);
  const key = createSiteKey();
  const [site] = await db
    .insert(sites)
    .values({
      workspaceId,
      name,
      allowedDomains: domains,
      siteKeyHash: sha256(key),
      siteKeyPrefix: key.slice(0, 11),
    })
    .returning({ id: sites.id });
  if (!site) throw new Error("Site was not created.");
  console.log(`Site created: ${name} (id=${site.id})`);
  console.log(`Copy this key now. It is only shown once: ${key}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
