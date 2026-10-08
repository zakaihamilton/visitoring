import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authSessions, users, workspaces } from "@/db/schema";
import { db } from "@/db";
import { createToken, hashSessionToken } from "@/lib/crypto";
import {
  PERMINISTER_SESSION_COOKIE,
  PerministerApiError,
  readPerministerSession,
  revokePerministerSession,
  usesPerministerAuth,
  visitoringUserForWorkspace,
  type VisitoringCurrentUser,
} from "@/lib/perminister";

const SESSION_COOKIE = PERMINISTER_SESSION_COOKIE;
const ACTIVE_WORKSPACE_COOKIE = "visitoring_workspace";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = VisitoringCurrentUser;

export async function createAuthSession(
  userId: string,
  expectedPasswordHash: string,
): Promise<string | null> {
  const token = createToken();
  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");
    if (!user?.isActive || user.passwordHash !== expectedPasswordHash) return false;

    await tx.insert(authSessions).values({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });
    return true;
  });
  return created ? token : null;
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  if (usesPerministerAuth()) {
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

  const [row] = await db
    .select({
      id: users.id,
      workspaceId: users.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      sessionId: authSessions.id,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .innerJoin(workspaces, eq(users.workspaceId, workspaces.id))
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row?.isActive || (row.role !== "admin" && row.role !== "viewer")) return null;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
    email: row.email,
    role: row.role,
  };
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
  if (usesPerministerAuth()) {
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
  } else if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)));
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
