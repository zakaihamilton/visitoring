import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PERMINISTER_SESSION_COOKIE,
  PerministerApiError,
  readPerministerSession,
  revokePerministerSession,
  visitoringUserForWorkspace,
  type VisitoringCurrentUser,
} from "@/lib/perminister";

const SESSION_COOKIE = PERMINISTER_SESSION_COOKIE;
const ACTIVE_WORKSPACE_COOKIE = "visitoring_workspace";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = VisitoringCurrentUser;

async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const workspaceSlug = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!workspaceSlug) return null;
  try {
    const session = await readPerministerSession(token);
    if (!session.authenticated) return null;
    return visitoringUserForWorkspace(session, workspaceSlug);
  } catch (error) {
    if (error instanceof PerministerApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function destroyAuthSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await revokePerministerSession(token);
    } catch (error) {
      console.error(
        "Visitoring could not revoke the Perminister session during sign-out.",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }
  jar.delete(SESSION_COOKIE);
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}
