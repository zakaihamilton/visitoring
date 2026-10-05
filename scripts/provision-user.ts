import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { users, workspaces } from "@/db/schema";
import { parseArgs, requiredArg } from "./args";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const workspaceId = requiredArg(args, "workspace-id");
  const email = requiredArg(args, "email").toLowerCase();
  const password = requiredArg(args, "password");
  const role = args.role ?? "viewer";
  if (role !== "admin" && role !== "viewer") throw new Error("Role must be admin or viewer.");
  if (password.length < 12) throw new Error("Use a password with at least 12 characters.");
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error(`Workspace ${workspaceId} was not found.`);
  const passwordHash = await hash(password);
  const [user] = await db
    .insert(users)
    .values({ workspaceId, email, passwordHash, role })
    .returning({ id: users.id });
  if (!user) throw new Error("User was not created.");
  console.log(`Provisioned ${role} user ${email} in workspace ${workspaceId} (id=${user.id}).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
