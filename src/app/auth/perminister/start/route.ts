import { NextResponse } from "next/server";
import { perministerAuthorizationUrl, perministerClientSecretForSso } from "@/lib/perminister";
import { makeVisitoringLastOrganizationCookieAvailable } from "@/lib/organization-cookies";
import {
  createPerministerSsoTransaction,
  perministerSsoCookieName,
  safeVisitoringReturnTo,
  sealPerministerSsoTransaction,
} from "@/lib/perminister-sso";

export const runtime = "nodejs";

function redirectToLogin(request: Request, error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    await makeVisitoringLastOrganizationCookieAvailable();
    const transaction = createPerministerSsoTransaction();
    const secret = perministerClientSecretForSso();
    const prompt = url.searchParams.get("prompt") === "login" ? "login" : undefined;
    const destination = perministerAuthorizationUrl(
      transaction.state,
      transaction.challenge,
      transaction.nonce,
      url.origin,
      prompt,
    );
    const redirectUri = new URL(destination).searchParams.get("redirect_uri") ?? "";
    if (!redirectUri) throw new Error("Perminister callback is missing.");
    const signedTransaction = {
      state: transaction.state,
      verifier: transaction.verifier,
      nonce: transaction.nonce,
      redirectUri,
      returnTo: safeVisitoringReturnTo(url.searchParams.get("next")),
    };
    const cookieName = perministerSsoCookieName(transaction.state);
    if (!cookieName) throw new Error("Invalid SSO transaction state.");
    const response = NextResponse.redirect(destination, 302);
    response.cookies.set(cookieName, sealPerministerSsoTransaction(signedTransaction, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return redirectToLogin(request, "sso");
  }
}
