import "dotenv/config";
import { db, pool } from "@/db";
import { workspaces } from "@/db/schema";
import { parseArgs, requiredArg } from "./args";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const name = requiredArg(args, "workspace");
  const slug = requiredArg(args, "slug").toLowerCase();
  const organizationId = requiredArg(args, "organization-id").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(organizationId))
    throw new Error("Organization ID must be a valid UUID.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Workspace slug must use lowercase letters, numbers, and hyphens.");

  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug, organizationId })
    .returning();
  if (!workspace) throw new Error("Workspace was not created.");
  console.log(`Workspace ${workspace.name} (${workspace.slug}) created; id=${workspace.id}.`);
  console.log(
    "In Perminister, grant the initial administrator the admin role for this Visitoring workspace.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
