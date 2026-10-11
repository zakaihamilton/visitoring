"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { requireOrganizationAdmin } from "@/lib/auth";
import {
  bootstrapVisitoringWorkspaceAdmin,
  revokeVisitoringWorkspaceGrants,
} from "@/lib/perminister";

export type ProjectActionState = { message: string; error?: boolean };

const failure = (message: string): ProjectActionState => ({ message, error: true });
const success = (message: string): ProjectActionState => ({ message });

function workspaceIdFrom(formData: FormData): string {
  return String(formData.get("workspaceId") ?? "").trim();
}

export async function createProjectAction(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const admin = await requireOrganizationAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) return failure("Enter a project name (up to 120 characters).");

  const workspaceId = randomUUID();
  const pendingAt = new Date();
  await db.insert(workspaces).values({
    id: workspaceId,
    name,
    organizationId: admin.organizationId,
    archivedAt: pendingAt,
    deletionPendingAt: pendingAt,
  });

  try {
    await bootstrapVisitoringWorkspaceAdmin(admin.organizationId, workspaceId);
    const activated = await db
      .update(workspaces)
      .set({ archivedAt: null, deletionPendingAt: null })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.organizationId, admin.organizationId),
          isNotNull(workspaces.archivedAt),
          isNotNull(workspaces.deletionPendingAt),
        ),
      )
      .returning({ id: workspaces.id });
    if (activated.length === 0) throw new Error("The workspace could not be activated.");
  } catch {
    const now = new Date();
    await db
      .update(workspaces)
      .set({ archivedAt: now, deletionPendingAt: now })
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.organizationId, admin.organizationId)),
      );

    try {
      await revokeVisitoringWorkspaceGrants(admin.organizationId, workspaceId);
      await db
        .delete(workspaces)
        .where(
          and(eq(workspaces.id, workspaceId), eq(workspaces.organizationId, admin.organizationId)),
        );
    } catch {
      // Keep the archived row so an organization admin can retry external cleanup.
    }
    revalidatePath("/projects");
    return failure(
      "We couldn't finish adding this project. Check the connection and try again. If it appears under pending deletion, retry the cleanup there.",
    );
  }

  revalidatePath("/projects");
  return success(`${name} added. You now have admin access to its workspace.`);
}

export async function manageProjectAction(
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const admin = await requireOrganizationAdmin();
  const workspaceId = workspaceIdFrom(formData);
  const operation = String(formData.get("operation") ?? "");
  if (!workspaceId) return failure("Choose a project to manage.");
  if (!["archive", "restore", "delete"].includes(operation))
    return failure("Choose a valid project action.");

  const [project] = await db
    .select({
      id: workspaces.id,
      archivedAt: workspaces.archivedAt,
      deletionPendingAt: workspaces.deletionPendingAt,
    })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.organizationId, admin.organizationId)))
    .limit(1);
  if (!project) return failure("We couldn't find that project in this organization.");

  if (operation === "archive") {
    if (project.archivedAt || project.deletionPendingAt)
      return failure("That project is already archived or being deleted.");
    const archived = await db
      .update(workspaces)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.organizationId, admin.organizationId),
          isNull(workspaces.archivedAt),
          isNull(workspaces.deletionPendingAt),
        ),
      )
      .returning({ id: workspaces.id });
    if (archived.length === 0) return failure("Project status changed. Refresh and try again.");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return success("Project archived. Collection is paused and its analytics are retained.");
  }

  if (operation === "restore") {
    if (!project.archivedAt || project.deletionPendingAt)
      return failure("Only archived projects that are not being deleted can be restored.");
    const restored = await db
      .update(workspaces)
      .set({ archivedAt: null })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.organizationId, admin.organizationId),
          isNotNull(workspaces.archivedAt),
          isNull(workspaces.deletionPendingAt),
        ),
      )
      .returning({ id: workspaces.id });
    if (restored.length === 0) return failure("Project status changed. Refresh and try again.");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return success("Project restored. Its existing tracking keys are active again.");
  }

  if (!project.archivedAt) return failure("Archive a project before deleting it permanently.");

  if (!project.deletionPendingAt) {
    const marked = await db
      .update(workspaces)
      .set({ deletionPendingAt: new Date() })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.organizationId, admin.organizationId),
          isNotNull(workspaces.archivedAt),
          isNull(workspaces.deletionPendingAt),
        ),
      )
      .returning({ id: workspaces.id });
    if (marked.length === 0) return failure("Project status changed. Refresh and try again.");
  }

  try {
    await revokeVisitoringWorkspaceGrants(admin.organizationId, workspaceId);
  } catch {
    revalidatePath("/projects");
    return failure(
      "Project access cleanup is still pending. Its analytics are retained; retry deletion when Perminister is available.",
    );
  }

  let deleted: Array<{ id: string }>;
  try {
    deleted = await db
      .delete(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.organizationId, admin.organizationId),
          isNotNull(workspaces.archivedAt),
          isNotNull(workspaces.deletionPendingAt),
        ),
      )
      .returning({ id: workspaces.id });
  } catch {
    revalidatePath("/projects");
    return failure(
      "Access was revoked, but Visitoring could not finish deleting the project. Retry deletion.",
    );
  }
  if (deleted.length === 0) {
    revalidatePath("/projects");
    return failure("Project cleanup is ready. Retry deletion to finish removing its analytics.");
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return success("Project and its Visitoring analytics were permanently deleted.");
}
