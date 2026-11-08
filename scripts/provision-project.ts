import "dotenv/config";
import { db, pool } from "@/db";
import { projects } from "@/db/schema";
import { parseArgs, requiredArg } from "./args";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const name = requiredArg(args, "project");
  const organizationId = requiredArg(args, "organization-id").trim().toLowerCase();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      organizationId,
    )
  )
    throw new Error("Organization ID must be a valid UUID.");
  const [project] = await db.insert(projects).values({ name, organizationId }).returning();
  if (!project) throw new Error("Project was not created.");
  console.log(`Project ${project.name} created; id=${project.id}.`);
  console.log(
    "In Perminister, grant the initial administrator the admin role for this Visitoring project.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
