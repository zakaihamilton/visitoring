import { NextResponse } from "next/server";
import { perministerAuthorizationUrl, perministerClientSecretForSso } from "@/lib/perminister";
import {
  createPerministerSsoTransaction,
  perministerSsoCookieName,
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
  const workspaceSlug = (url.searchParams.get("workspace") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(workspaceSlug)) {
    return redirectToLogin(request, "workspace");
  }

  try {
    const transaction = createPerministerSsoTransaction(workspaceSlug);
    const secret = perministerClientSecretForSso();
    const destination = perministerAuthorizationUrl(
      transaction.state,
      transaction.challenge,
      url.origin,
    );
    const cookieName = perministerSsoCookieName(transaction.state);
    if (!cookieName) throw new Error("Invalid SSO transaction state.");
    const response = NextResponse.redirect(destination, 302);
    response.cookies.set(cookieName, sealPerministerSsoTransaction(transaction, secret), {
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
