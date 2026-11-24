import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { endDatabasePools, getDb } from "@/db";
import { projects, sites } from "@/db/schema";
import { createSiteKey, sha256 } from "@/lib/crypto";
import { parseAllowedDomains } from "@/lib/domains";
import { parseArgs, requiredArg } from "./args";

loadEnv({ path: [".env.local", ".env"] });

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const projectId = requiredArg(args, "project-id");
  const name = requiredArg(args, "name");
  const domains = parseAllowedDomains(requiredArg(args, "domains"));
  const db = await getDb();
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new Error(`Project ${projectId} was not found.`);
  const key = createSiteKey();
  const [site] = await db
    .insert(sites)
    .values({
      projectId,
      name,
      allowedDomains: domains,
      siteKey: key,
      siteKeyHash: sha256(key),
      siteKeyPrefix: key.slice(0, 11),
    })
    .returning({ id: sites.id });
  if (!site) throw new Error("Site was not created.");
  console.log(`Site created: ${name} (id=${site.id})`);
  console.log(`Tracking key (also available in Settings → Sites): ${key}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => endDatabasePools());
