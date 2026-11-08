"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireOrganizationAdmin } from "@/lib/auth";
import {
  bootstrapVisitoringProjectAdmin,
  revokeVisitoringProjectGrants,
} from "@/lib/perminister";

export type ProjectActionState = { message: string; error?: boolean };

const failure = (message: string): ProjectActionState => ({ message, error: true });
const success = (message: string): ProjectActionState => ({ message });

function revalidateProjectManagement() {
  revalidatePath("/organization/admin");
  revalidatePath("/projects");
}

function projectIdFrom(formData: FormData): string {
  return String(formData.get("projectId") ?? "").trim();
}

type ProjectStatus = "active" | "archived" | "deletion-pending";

function projectStatusCondition(
  projectId: string,
  organizationId: string,
  status: ProjectStatus,
) {
  return and(
    eq(projects.id, projectId),
    eq(projects.organizationId, organizationId),
    status === "active" ? isNull(projects.archivedAt) : isNotNull(projects.archivedAt),
    status === "deletion-pending"
      ? isNotNull(projects.deletionPendingAt)
      : isNull(projects.deletionPendingAt),
  );
}

export async function createProjectAction(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const admin = await requireOrganizationAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) return failure("Enter a project name (up to 120 characters).");

  const projectId = randomUUID();
  const pendingAt = new Date();
  await db.insert(projects).values({
    id: projectId,
    name,
    organizationId: admin.organizationId,
    archivedAt: pendingAt,
    deletionPendingAt: pendingAt,
  });

  try {
    await bootstrapVisitoringProjectAdmin(admin.organizationId, projectId);
    const activated = await db
      .update(projects)
      .set({ archivedAt: null, deletionPendingAt: null })
      .where(projectStatusCondition(projectId, admin.organizationId, "deletion-pending"))
      .returning({ id: projects.id });
    if (activated.length === 0) throw new Error("The project could not be activated.");
  } catch {
    const now = new Date();
    await db
      .update(projects)
      .set({ archivedAt: now, deletionPendingAt: now })
      .where(
        and(eq(projects.id, projectId), eq(projects.organizationId, admin.organizationId)),
      );

    try {
      await revokeVisitoringProjectGrants(admin.organizationId, projectId);
      await db
        .delete(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.organizationId, admin.organizationId)),
        );
    } catch {
      // Keep the archived row so an organization admin can retry external cleanup.
    }
    revalidateProjectManagement();
    return failure(
      "We couldn't finish adding this project. Check the connection and try again. If it appears under pending deletion, retry the cleanup there.",
    );
  }

  revalidateProjectManagement();
  return success(`${name} added. You now have admin access to its project.`);
}

export async function manageProjectAction(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const admin = await requireOrganizationAdmin();
  const projectId = projectIdFrom(formData);
  const operation = String(formData.get("operation") ?? "");
  if (!projectId) return failure("Choose a project to manage.");
  if (!["archive", "restore", "delete"].includes(operation))
    return failure("Choose a valid project action.");

  const [project] = await db
    .select({
      id: projects.id,
      archivedAt: projects.archivedAt,
      deletionPendingAt: projects.deletionPendingAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, admin.organizationId)))
    .limit(1);
  if (!project) return failure("We couldn't find that project in this organization.");

  if (operation === "archive") {
    if (project.archivedAt || project.deletionPendingAt)
      return failure("That project is already archived or being deleted.");
    const archived = await db
      .update(projects)
      .set({ archivedAt: new Date() })
      .where(projectStatusCondition(projectId, admin.organizationId, "active"))
      .returning({ id: projects.id });
    if (archived.length === 0) return failure("Project status changed. Refresh and try again.");
    revalidateProjectManagement();
    revalidatePath("/dashboard");
    return success("Project archived. Collection is paused and its analytics are retained.");
  }

  if (operation === "restore") {
    if (!project.archivedAt || project.deletionPendingAt)
      return failure("Only archived projects that are not being deleted can be restored.");
    const restored = await db
      .update(projects)
      .set({ archivedAt: null })
      .where(projectStatusCondition(projectId, admin.organizationId, "archived"))
      .returning({ id: projects.id });
    if (restored.length === 0) return failure("Project status changed. Refresh and try again.");
    revalidateProjectManagement();
    revalidatePath("/dashboard");
    return success("Project restored. Its existing tracking keys are active again.");
  }

  if (!project.archivedAt) return failure("Archive a project before deleting it permanently.");

  if (!project.deletionPendingAt) {
    const marked = await db
      .update(projects)
      .set({ deletionPendingAt: new Date() })
      .where(projectStatusCondition(projectId, admin.organizationId, "archived"))
      .returning({ id: projects.id });
    if (marked.length === 0) return failure("Project status changed. Refresh and try again.");
  }

  try {
    await revokeVisitoringProjectGrants(admin.organizationId, projectId);
  } catch {
    revalidateProjectManagement();
    return failure(
      "Project access cleanup is still pending. Its analytics are retained; retry deletion when Perminister is available.",
    );
  }

  let deleted: Array<{ id: string }>;
  try {
    deleted = await db
      .delete(projects)
      .where(projectStatusCondition(projectId, admin.organizationId, "deletion-pending"))
      .returning({ id: projects.id });
  } catch {
    revalidateProjectManagement();
    return failure(
      "Access was revoked, but Visitoring could not finish deleting the project. Retry deletion.",
    );
  }
  if (deleted.length === 0) {
    revalidateProjectManagement();
    return failure("Project cleanup is ready. Retry deletion to finish removing its analytics.");
  }

  revalidateProjectManagement();
  revalidatePath("/dashboard");
  return success("Project and its Visitoring analytics were permanently deleted.");
}
