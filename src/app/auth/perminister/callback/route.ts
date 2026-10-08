import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangePerministerAuthorizationCode,
  perministerClientSecretForSso,
  revokePerministerSession,
  visitoringUserForWorkspace,
} from "@/lib/perminister";
import { setSessionCookie } from "@/lib/auth";
import {
  matchesPerministerSsoState,
  perministerSsoCookieName,
  readPerministerSsoTransaction,
} from "@/lib/perminister-sso";

export const runtime = "nodejs";

function responseToLogin(request: Request, error = "sso", state = "") {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url), 303);
  const cookieName = perministerSsoCookieName(state);
  if (cookieName) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (url.searchParams.has("error") || !code || !state)
    return responseToLogin(request, "sso", state);

  const cookieName = perministerSsoCookieName(state);
  if (!cookieName) return responseToLogin(request, "sso", state);

  try {
    const secret = perministerClientSecretForSso();
    const cookieValue = (await cookies()).get(cookieName)?.value;
    const transaction = readPerministerSsoTransaction(cookieValue, secret);
    if (!transaction || !matchesPerministerSsoState(transaction.state, state)) {
      return responseToLogin(request, "sso", state);
    }

    const auth = await exchangePerministerAuthorizationCode(code, transaction.verifier);
    const user = await visitoringUserForWorkspace(auth, transaction.workspaceSlug);
    if (!user) {
      try {
        await revokePerministerSession(auth.sessionToken);
      } catch {
        // The local workspace check failed; the new token is never returned to the browser.
      }
      return responseToLogin(request, "invalid", state);
    }

    await setSessionCookie(auth.sessionToken);
    const jar = await cookies();
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    };
    jar.set("visitoring_last_project", transaction.workspaceSlug, {
      ...cookieOptions,
      path: "/login",
    });
    jar.set("visitoring_workspace", transaction.workspaceSlug, {
      ...cookieOptions,
      path: "/",
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return responseToLogin(request, "sso", state);
  }
}
