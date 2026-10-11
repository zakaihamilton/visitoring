import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PERMINISTER_SESSION_COOKIE,
  PerministerApiError,
  isVisitoringOrganizationAdmin,
  readPerministerSession,
  revokePerministerSession,
  visitoringOrganizationForId,
  visitoringUserForWorkspace,
  visitoringWorkspacesForOrganization,
  type VisitoringCurrentUser,
  type VisitoringWorkspaceChoice,
} from "@/lib/perminister";
import { setVisitoringWorkspaceCookie } from "@/lib/workspace-cookies";

const SESSION_COOKIE = PERMINISTER_SESSION_COOKIE;
const ACTIVE_ORGANIZATION_COOKIE = "visitoring_organization_id";
const ACTIVE_WORKSPACE_COOKIE = "visitoring_workspace_id";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = VisitoringCurrentUser;

async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const organizationId = jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const workspaceId = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!organizationId || !workspaceId) return null;
  try {
    const session = await readPerministerSession(token);
    if (!session.authenticated) return null;
    return visitoringUserForWorkspace(session, organizationId, workspaceId);
  } catch (error) {
    if (error instanceof PerministerApiError && error.status === 401) return null;
    throw error;
  }
}

async function requireOrganizationSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const organizationId = jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  if (!token || !organizationId) redirect("/login");

  let session: Awaited<ReturnType<typeof readPerministerSession>>;
  try {
    session = await readPerministerSession(token);
  } catch (error) {
    if (error instanceof PerministerApiError && error.status === 401) redirect("/login");
    throw error;
  }

  const organization = visitoringOrganizationForId(session, organizationId);
  if (!organization) redirect("/login?error=invalid");
  return { session, organization };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const jar = await cookies();
    if (jar.get(SESSION_COOKIE)?.value && jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value)
      redirect("/projects");
    redirect("/login");
  }
  return user;
}

export async function requireOrganizationWorkspaces(): Promise<{
  organizationId: string;
  organizationName: string;
  canManageProjects: boolean;
  workspaces: VisitoringWorkspaceChoice[];
}> {
  const { session, organization } = await requireOrganizationSession();

  return {
    organizationId: organization.organizationId,
    organizationName: organization.organizationName,
    canManageProjects: isVisitoringOrganizationAdmin(session, organization.organizationId),
    workspaces: await visitoringWorkspacesForOrganization(session, organization.organizationId),
  };
}

export async function requireOrganizationAdmin(): Promise<{
  actorId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
}> {
  const { session, organization } = await requireOrganizationSession();
  if (!isVisitoringOrganizationAdmin(session, organization.organizationId))
    redirect("/projects?error=forbidden");

  return {
    actorId: session.account.subjectId,
    email: session.account.email,
    organizationId: organization.organizationId,
    organizationName: organization.organizationName,
  };
}

export async function selectVisitoringWorkspace(workspaceId: string): Promise<void> {
  const { session, organization } = await requireOrganizationSession();
  const user = await visitoringUserForWorkspace(session, organization.organizationId, workspaceId);
  if (!user) redirect("/projects?error=access");
  await setVisitoringWorkspaceCookie(workspaceId);
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
