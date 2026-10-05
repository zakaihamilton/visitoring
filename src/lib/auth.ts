import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authSessions, users, workspaces } from "@/db/schema";
import { db } from "@/db";
import { createToken, hashSessionToken } from "@/lib/crypto";

const SESSION_COOKIE = "visitoring_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: "admin" | "viewer";
};

export async function createAuthSession(userId: string): Promise<string> {
  const token = createToken();
  await db.insert(authSessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return token;
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      workspaceId: users.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      email: users.email,
      role: users.role,
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
  if (!row || (row.role !== "admin" && row.role !== "viewer")) return null;
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
  if (token)
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)));
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
