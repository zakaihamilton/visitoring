"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthSession, destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";
import { authenticateWorkspaceUser } from "@/lib/user-management";

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

  const user = await authenticateWorkspaceUser({ email, workspaceSlug, password });
  if (!user) redirect("/login?error=invalid");

  await clearLoginAccountAttempts({ email, workspaceSlug });
  const token = await createAuthSession(user.id, user.passwordHash);
  if (!token) redirect("/login?error=invalid");
  await setSessionCookie(token);
  (await cookies()).set("visitoring_last_project", workspaceSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/login",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
