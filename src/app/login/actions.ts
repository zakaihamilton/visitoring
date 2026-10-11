"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { destroyAuthSession, setSessionCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/privacy";
import { clearLoginAccountAttempts, isLoginRateLimited } from "@/lib/login-rate-limit";
import {
  makeVisitoringLastOrganizationCookieAvailable,
  setInitialVisitoringOrganization,
} from "@/lib/organization-cookies";
import {
  loginWithPerminister,
  PerministerApiError,
  revokePerministerSession,
  visitoringOrganizations,
} from "@/lib/perminister";

export async function startPerministerLoginAction(): Promise<void> {
  await makeVisitoringLastOrganizationCookieAvailable();
  redirect("/auth/perminister/start");
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || password.length > 1024) redirect("/login?error=invalid");

  const ip = clientIpFromHeaders(await headers());
  if (await isLoginRateLimited({ email, ip })) redirect("/login?error=invalid");

  let token: string | null = null;
  let organizations = [] as ReturnType<typeof visitoringOrganizations>;
  let loginError: "invalid" | "unavailable" | null = null;
  try {
    const session = await loginWithPerminister(email, password);
    organizations = visitoringOrganizations(session);
    if (organizations.length === 0) {
      try {
        await revokePerministerSession(session.sessionToken);
      } catch {
        // The missing Visitoring access is rejected locally; the token is never sent to the browser.
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

  await clearLoginAccountAttempts({ email });
  await setInitialVisitoringOrganization(organizations);
  await setSessionCookie(token);
  redirect("/projects");
}

export async function logoutAction(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}
