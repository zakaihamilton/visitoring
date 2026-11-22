import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { setInitialVisitoringOrganization } from "@/lib/organization-cookies";
import {
  exchangePerministerAuthorizationCode,
  perministerClientSecretForSso,
  revokePerministerSession,
  visitoringOrganizations,
} from "@/lib/perminister";
import {
  matchesPerministerSsoState,
  perministerSsoCookieName,
  readPerministerSsoTransaction,
  safeVisitoringReturnTo,
} from "@/lib/perminister-sso";

export const runtime = "nodejs";

function responseToLogin(
  request: Request,
  error = "sso",
  state = "",
  returnTo: string | null = null,
) {
  const query = new URLSearchParams({ error });
  const safeReturn = safeVisitoringReturnTo(returnTo);
  if (safeReturn) query.set("next", safeReturn);
  const response = NextResponse.redirect(new URL(`/login?${query}`, request.url), 303);
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
  const state = url.searchParams.get("state") ?? "";
  let returnTo: string | null = null;
  const codes = url.searchParams.getAll("code");
  if (url.searchParams.getAll("state").length !== 1) {
    return responseToLogin(request, "sso", state);
  }
  const cookieName = perministerSsoCookieName(state);
  if (!cookieName || url.searchParams.getAll("state").length !== 1) {
    return responseToLogin(request, "sso", state);
  }

  try {
    const secret = perministerClientSecretForSso();
    const cookieValue = (await cookies()).get(cookieName)?.value;
    const transaction = readPerministerSsoTransaction(cookieValue, secret);
    if (!transaction || !matchesPerministerSsoState(transaction.state, state)) {
      return responseToLogin(request, "sso", state);
    }
    returnTo = transaction.returnTo;
    if (
      url.searchParams.has("error") ||
      url.searchParams.getAll("error").length > 1 ||
      codes.length !== 1 ||
      !codes[0] ||
      codes[0].length > 2048
    ) {
      return responseToLogin(request, "sso", state, returnTo);
    }

    const auth = await exchangePerministerAuthorizationCode(
      codes[0],
      transaction.verifier,
      transaction.nonce,
      transaction.redirectUri,
    );
    const organizations = visitoringOrganizations(auth);
    if (organizations.length === 0) {
      try {
        await revokePerministerSession(auth.sessionToken);
      } catch {
        // Reject the product session locally even if central revocation is unavailable.
      }
      return responseToLogin(request, "invalid", state, transaction.returnTo);
    }

    await setInitialVisitoringOrganization(organizations);
    await setSessionCookie(auth.sessionToken);

    const response = NextResponse.redirect(
      new URL(transaction.returnTo ?? "/projects", request.url),
      303,
    );
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
    return responseToLogin(request, "sso", state, returnTo);
  }
}
