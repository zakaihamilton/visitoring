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
  visitoringOrganizations,
  visitoringUserForWorkspace,
  visitoringWorkspacesForOrganization,
  type VisitoringCurrentUser,
  type VisitoringOrganizationChoice,
  type VisitoringWorkspaceChoice,
} from "@/lib/perminister";
import { setVisitoringWorkspaceCookie } from "@/lib/workspace-cookies";

const SESSION_COOKIE = PERMINISTER_SESSION_COOKIE;
const ACTIVE_ORGANIZATION_COOKIE = "visitoring_organization_id";
const ACTIVE_WORKSPACE_COOKIE = "visitoring_workspace_id";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type CurrentUser = VisitoringCurrentUser & {
  organizations: VisitoringOrganizationChoice[];
  canManageOrganization: boolean;
};

export type OrganizationAdmin = {
  actorId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  organizations: VisitoringOrganizationChoice[];
};

async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await readPerministerSession(token);
    if (!session.authenticated) return null;
    const organizationId = jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
    const workspaceId = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (!organizationId || !workspaceId) return null;
    if (!visitoringOrganizationForId(session, organizationId)) return null;
    const user = await visitoringUserForWorkspace(session, organizationId, workspaceId);
    if (!user) return null;
    return {
      ...user,
      organizations: visitoringOrganizations(session),
      canManageOrganization: isVisitoringOrganizationAdmin(session, organizationId),
    };
  } catch (error) {
    if (error instanceof PerministerApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requirePerministerSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  let session: Awaited<ReturnType<typeof readPerministerSession>>;
  try {
    session = await readPerministerSession(token);
  } catch (error) {
    if (error instanceof PerministerApiError && error.status === 401) redirect("/login");
    throw error;
  }
  if (!session.authenticated) redirect("/login");
  return session;
}

export async function requireVisitoringOrganizations() {
  const session = await requirePerministerSession();
  const organizations = visitoringOrganizations(session);
  if (organizations.length === 0) redirect("/login?error=invalid");
  return { session, organizations };
}

async function requireOrganizationSession() {
  const jar = await cookies();
  const organizationId = jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const session = await requirePerministerSession();
  if (!organizationId) redirect("/auth/organization/default");

  const organization = visitoringOrganizationForId(session, organizationId);
  if (!organization) redirect("/auth/organization/default");
  return { session, organization };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)?.value) redirect("/login");
  const session = await requirePerministerSession();
  const organizationId = jar.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  if (visitoringOrganizations(session).length === 0) redirect("/login?error=invalid");
  if (!organizationId || !visitoringOrganizationForId(session, organizationId))
    redirect("/auth/organization/default");
  redirect("/projects");
}

export async function requireOrganizationWorkspaces(): Promise<{
  organizationId: string;
  organizationName: string;
  organizations: VisitoringOrganizationChoice[];
  canManageProjects: boolean;
  workspaces: VisitoringWorkspaceChoice[];
}> {
  const { session, organization } = await requireOrganizationSession();

  return {
    organizationId: organization.organizationId,
    organizationName: organization.organizationName,
    organizations: visitoringOrganizations(session),
    canManageProjects: isVisitoringOrganizationAdmin(session, organization.organizationId),
    workspaces: await visitoringWorkspacesForOrganization(session, organization.organizationId),
  };
}

export async function requireOrganizationAdmin(): Promise<OrganizationAdmin> {
  const { session, organization } = await requireOrganizationSession();
  if (!isVisitoringOrganizationAdmin(session, organization.organizationId))
    redirect("/projects?error=forbidden");

  return {
    actorId: session.account.subjectId,
    email: session.account.email,
    organizationId: organization.organizationId,
    organizationName: organization.organizationName,
    organizations: visitoringOrganizations(session),
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
