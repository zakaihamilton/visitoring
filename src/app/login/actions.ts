"use server";

import { verify } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { createAuthSession, destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const workspaceSlug = String(formData.get("workspace") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !workspaceSlug || !password || password.length > 1024)
    redirect("/login?error=invalid");

  const ip = clientIpFromHeaders(await headers());
  if (await isLoginRateLimited({ email, workspaceSlug, ip })) redirect("/login?error=invalid");

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .innerJoin(workspaces, eq(users.workspaceId, workspaces.id))
    .where(and(eq(users.email, email), eq(workspaces.slug, workspaceSlug)))
    .limit(1);
  if (!user || !(await verify(user.passwordHash, password))) redirect("/login?error=invalid");

  await clearLoginAccountAttempts({ email, workspaceSlug });
  const token = await createAuthSession(user.id);
  await setSessionCookie(token);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
