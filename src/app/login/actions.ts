"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";
import { setVisitoringWorkspaceCookies } from "@/lib/workspace-cookies";
import {
  loginWithPerminister,
  PerministerApiError,
  revokePerministerSession,
  visitoringUserForWorkspace,
} from "@/lib/perminister";

export async function startPerministerLoginAction(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get("workspace") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(workspaceSlug)) {
    redirect("/login?error=workspace");
  }
  redirect(`/auth/perminister/start?workspace=${encodeURIComponent(workspaceSlug)}`);
}

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
  if (loginError) redirect(`/login?error=${loginError}`);
  if (!token) redirect("/login?error=invalid");

  await clearLoginAccountAttempts({ email, workspaceSlug });
  await setSessionCookie(token);
  await setVisitoringWorkspaceCookies(workspaceSlug);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
