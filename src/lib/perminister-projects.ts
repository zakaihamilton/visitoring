import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import {
  type ConsumerOrganization,
  type ConsumerSession,
  PerministerApiError,
  perministerConfiguration,
  type ResourceRole,
  requestPerminister,
  VISITORING_PRODUCT_ID,
  type VisitoringRole,
} from "./perminister-client";

export type VisitoringProjectChoice = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: VisitoringRole;
};

export type VisitoringOrganizationChoice = {
  organizationId: string;
  organizationName: string;
};

type VisitoringProjectMember = {
  id: string;
  email: string | null;
  role: VisitoringRole;
  isActive: boolean;
};

export type VisitoringCurrentUser = {
  id: string;
  projectId: string;
  projectName: string;
  organizationId: string;
  organizationName: string;
  email: string | null;
  role: VisitoringRole;
};

export function visitoringOrganizations(auth: ConsumerSession): VisitoringOrganizationChoice[] {
  const config = perministerConfiguration();
  const organizations = new Map<string, VisitoringOrganizationChoice>();
  for (const organization of auth.organizations) {
    if (organization.productId !== config.productId) continue;
    const organizationId = organization.organizationId.toLowerCase();
    if (!organizations.has(organizationId)) {
      organizations.set(organizationId, {
        organizationId,
        organizationName: organization.organizationName,
      });
    }
  }
  return [...organizations.values()].sort(
    (left, right) =>
      left.organizationName.localeCompare(right.organizationName) ||
      left.organizationId.localeCompare(right.organizationId),
  );
}

export function visitoringOrganizationForId(
  auth: ConsumerSession,
  organizationId: string,
): ConsumerOrganization | null {
  const config = perministerConfiguration();
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = auth.organizations.find(
    (item) =>
      item.organizationId.toLowerCase() === normalizedOrganizationId &&
      item.productId === config.productId,
  );
  return organization ?? null;
}

export function isVisitoringOrganizationAdmin(
  auth: ConsumerSession,
  organizationId: string,
): boolean {
  const organization = visitoringOrganizationForId(auth, organizationId);
  return organization?.organizationRole === "owner" || organization?.organizationRole === "admin";
}

export async function bootstrapVisitoringProjectAdmin(
  organizationId: string,
  projectId: string,
): Promise<void> {
  const result = await requestPerminister<unknown>("/api/auth/consumer/projects", {
    method: "POST",
    body: { organizationId, projectId },
  });
  if (
    typeof result !== "object" ||
    result === null ||
    !("granted" in result) ||
    result.granted !== true
  ) {
    throw new PerministerApiError(503, "Perminister returned an invalid project grant response.");
  }
}

export async function revokeVisitoringProjectGrants(
  organizationId: string,
  projectId: string,
): Promise<void> {
  const result = await requestPerminister<unknown>(
    `/api/auth/consumer/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: { organizationId } },
  );
  if (
    typeof result !== "object" ||
    result === null ||
    !("revoked" in result) ||
    result.revoked !== true
  ) {
    throw new PerministerApiError(
      503,
      "Perminister returned an invalid project revocation response.",
    );
  }

  // Earlier Visitoring releases stored project access as workspace-scoped grants. IDs are
  // preserved by the database rename, so remove those grants as part of project deletion too.
  const legacyResult = await requestPerminister<unknown>(
    `/api/auth/consumer/workspaces/${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: { organizationId } },
  );
  if (
    typeof legacyResult !== "object" ||
    legacyResult === null ||
    !("revoked" in legacyResult) ||
    legacyResult.revoked !== true
  ) {
    throw new PerministerApiError(503, "Perminister returned an invalid legacy grant response.");
  }
}

function projectGrantResourceId(
  item: ResourceRole,
  organizationId: string,
  projectId?: string,
): string | null {
  const scope = item.scope;
  if (
    scope.organizationId?.toLowerCase() !== organizationId ||
    scope.productId !== VISITORING_PRODUCT_ID
  ) {
    return null;
  }

  const resourceId =
    scope.kind === "project"
      ? scope.projectId
      : scope.kind === "workspace"
        ? scope.workspaceId
        : undefined;
  const action = scope.kind === "project" ? "visitoring:project:read" : "visitoring:workspace:read";
  if (
    !resourceId ||
    (projectId && resourceId.toLowerCase() !== projectId.toLowerCase()) ||
    !item.actions.includes(action) ||
    (item.role !== "admin" && item.role !== "viewer")
  ) {
    return null;
  }
  return resourceId.toLowerCase();
}

function visitoringRoleForProject(
  organization: ConsumerOrganization,
  organizationId: string,
  projectId: string,
): VisitoringRole | null {
  if (organization.organizationRole === "owner" || organization.organizationRole === "admin") {
    return "admin";
  }

  const grants = organization.resourceRoles.filter(
    (item) => projectGrantResourceId(item, organizationId, projectId) !== null,
  );
  if (grants.some((item) => item.role === "admin")) return "admin";
  if (grants.some((item) => item.role === "viewer")) return "viewer";
  return null;
}

export async function visitoringProjectsForOrganization(
  auth: ConsumerSession,
  organizationId: string,
): Promise<VisitoringProjectChoice[]> {
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = visitoringOrganizationForId(auth, organizationId);
  if (!organization) return [];

  const isOrganizationAdmin =
    organization.organizationRole === "owner" || organization.organizationRole === "admin";
  const projectIds = isOrganizationAdmin
    ? []
    : [
        ...new Set(
          organization.resourceRoles
            .filter((item) => projectGrantResourceId(item, normalizedOrganizationId) !== null)
            .map((item) => projectGrantResourceId(item, normalizedOrganizationId))
            .filter((projectId): projectId is string => projectId !== null),
        ),
      ];
  if (!isOrganizationAdmin && projectIds.length === 0) return [];

  const db = await getDb();

  const activeProjects = () =>
    db
      .select({
        id: projects.id,
        name: projects.name,
        organizationId: projects.organizationId,
      })
      .from(projects);
  const accessibleProjects = isOrganizationAdmin
    ? await activeProjects().where(
        and(
          eq(projects.organizationId, normalizedOrganizationId),
          isNull(projects.archivedAt),
          isNull(projects.deletionPendingAt),
        ),
      )
    : await activeProjects()
        .where(
          and(
            inArray(projects.id, projectIds),
            eq(projects.organizationId, normalizedOrganizationId),
            isNull(projects.archivedAt),
            isNull(projects.deletionPendingAt),
          ),
        )
        .limit(projectIds.length);

  return accessibleProjects
    .map((project) => {
      const role = visitoringRoleForProject(organization, normalizedOrganizationId, project.id);
      return role ? { ...project, organizationName: organization.organizationName, role } : null;
    })
    .filter((project): project is VisitoringProjectChoice => project !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function visitoringUserForProject(
  auth: ConsumerSession,
  organizationId: string,
  projectId: string,
): Promise<VisitoringCurrentUser | null> {
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = auth.organizations.find(
    (item) =>
      item.organizationId.toLowerCase() === normalizedOrganizationId &&
      item.productId === perministerConfiguration().productId,
  );
  if (!organization) return null;

  const db = await getDb();
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      organizationId: projects.organizationId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, normalizedOrganizationId),
        isNull(projects.archivedAt),
        isNull(projects.deletionPendingAt),
      ),
    )
    .limit(1);
  if (!project) return null;

  const role = visitoringRoleForProject(organization, normalizedOrganizationId, project.id);
  if (!role) return null;

  return {
    id: auth.account.subjectId,
    projectId: project.id,
    projectName: project.name,
    organizationId: project.organizationId,
    organizationName: organization.organizationName,
    email: auth.account.email,
    role,
  };
}

export async function consumerProjectScope(projectId: string) {
  const db = await getDb();
  const [project] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new PerministerApiError(404, "Project not found.");
  return {
    organizationId: project.organizationId,
    scopeKind: "project",
    resourceId: projectId,
  };
}

export async function listPerministerProjectMembers(
  projectId: string,
  knownOrganizationId?: string,
): Promise<VisitoringProjectMember[]> {
  perministerConfiguration();
  const scope = knownOrganizationId
    ? {
        organizationId: knownOrganizationId,
        scopeKind: "project",
        resourceId: projectId,
      }
    : await consumerProjectScope(projectId);
  const params = new URLSearchParams(scope);
  const result = await requestPerminister<{ members: Array<Record<string, unknown>> }>(
    `/api/auth/consumer/members?${params.toString()}`,
  );
  if (!Array.isArray(result.members)) {
    throw new PerministerApiError(503, "Perminister returned an invalid member list.");
  }
  return result.members.map((member) => {
    if (
      typeof member.subjectId !== "string" ||
      (member.email !== null && typeof member.email !== "string") ||
      (member.role !== "admin" && member.role !== "viewer") ||
      typeof member.active !== "boolean"
    ) {
      throw new PerministerApiError(503, "Perminister returned an invalid member list.");
    }
    return {
      id: member.subjectId,
      email: member.email as string | null,
      role: member.role,
      isActive: member.active,
    };
  });
}
