"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";
import { setVisitoringOrganizationCookies } from "@/lib/organization-cookies";
import {
  loginWithPerminister,
  PerministerApiError,
  revokePerministerSession,
  hasVisitoringOrganization,
} from "@/lib/perminister";

const ORGANIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startPerministerLoginAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "")
    .trim()
    .toLowerCase();
  if (!ORGANIZATION_ID_PATTERN.test(organizationId)) {
    redirect("/login?error=organization");
  }
  redirect(`/auth/perminister/start?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const organizationId = String(formData.get("organizationId") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (
    !email ||
    !ORGANIZATION_ID_PATTERN.test(organizationId) ||
    !password ||
    password.length > 1024
  )
    redirect("/login?error=invalid");

  const ip = clientIpFromHeaders(await headers());
  if (await isLoginRateLimited({ email, organizationId, ip })) redirect("/login?error=invalid");

  let token: string | null = null;
  let loginError: "invalid" | "unavailable" | null = null;
  try {
    const session = await loginWithPerminister(email, password);
    if (!hasVisitoringOrganization(session, organizationId)) {
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

  await clearLoginAccountAttempts({ email, organizationId });
  await setSessionCookie(token);
  await setVisitoringOrganizationCookies(organizationId);
  redirect("/projects");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
