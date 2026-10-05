import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { db, pool } from "@/db";
import { users, workspaces } from "@/db/schema";
import { parseArgs, requiredArg } from "./args";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const name = requiredArg(args, "workspace");
  const slug = requiredArg(args, "slug").toLowerCase();
  const email = requiredArg(args, "email").toLowerCase();
  const password = requiredArg(args, "password");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Workspace slug must use lowercase letters, numbers, and hyphens.");
  if (password.length < 12) throw new Error("Use an initial password with at least 12 characters.");
  const passwordHash = await hash(password);

  const result = await db.transaction(async (transaction) => {
    const [workspace] = await transaction.insert(workspaces).values({ name, slug }).returning();
    if (!workspace) throw new Error("Workspace was not created.");
    const [user] = await transaction
      .insert(users)
      .values({
        workspaceId: workspace.id,
        email,
        passwordHash,
        role: "admin",
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Administrator was not created.");
    return { workspace, user };
  });
  console.log(
    `Workspace ${result.workspace.name} (${result.workspace.slug}) created; id=${result.workspace.id}.`,
  );
  console.log(`Initial administrator: ${email}; id=${result.user.id}; role=admin`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
