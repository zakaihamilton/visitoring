"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthSession, destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";
import { authenticateWorkspaceUser } from "@/lib/user-management";
import {
  loginWithPerminister,
  PerministerApiError,
  revokePerministerSession,
  usesPerministerAuth,
  visitoringUserForWorkspace,
} from "@/lib/perminister";

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

  let token: string | null = null;
  let loginError: "invalid" | "unavailable" | null = null;
  if (usesPerministerAuth()) {
    try {
      const session = await loginWithPerminister(email, password);
      const user = await visitoringUserForWorkspace(session, workspaceSlug);
      if (!user) {
        try {
          await revokePerministerSession(session.sessionToken);
        } catch {
          // The invalid scope is rejected locally; the opaque token is never sent to the browser.
        }
        loginError = "invalid";
      } else {
        token = session.sessionToken;
      }
    } catch (error) {
      loginError =
        error instanceof PerministerApiError && error.status < 500 ? "invalid" : "unavailable";
    }
  } else {
    const user = await authenticateWorkspaceUser({ email, workspaceSlug, password });
    if (!user) loginError = "invalid";
    else token = await createAuthSession(user.id, user.passwordHash);
  }
  if (loginError) redirect(`/login?error=${loginError}`);
  if (!token) redirect("/login?error=invalid");

  await clearLoginAccountAttempts({ email, workspaceSlug });
  await setSessionCookie(token);
  const jar = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };
  jar.set("visitoring_last_project", workspaceSlug, { ...cookieOptions, path: "/login" });
  jar.set("visitoring_workspace", workspaceSlug, { ...cookieOptions, path: "/" });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
