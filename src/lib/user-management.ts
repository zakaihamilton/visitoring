import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { PerministerApiError, requestPerminister } from "@/lib/perminister";

const emailSchema = z.string().email().max(254);
const roleSchema = z.enum(["admin", "viewer"]);

export type UserManagementResult = { message: string; error?: boolean };

function failure(message: string): UserManagementResult {
  return { message, error: true };
}

function success(message: string): UserManagementResult {
  return { message };
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return emailSchema.safeParse(email).success ? email : null;
}

function validPassword(value: string): boolean {
  return value.length >= 15 && value.length <= 256;
}

function cannotChangeSelf(actorId: string, targetId: string): boolean {
  return actorId === targetId;
}

function perminResponseMessage(error: unknown): string {
  if (error instanceof PerministerApiError) {
    if (error.status === 401) return "Your session expired. Sign in again and retry.";
    if (error.status >= 400 && error.status < 500) return error.message;
  }
  return "Perminister is temporarily unavailable. Please try again shortly.";
}

async function consumerWorkspaceScope(workspaceId: string) {
  const [workspace] = await db
    .select({ organizationId: workspaces.organizationId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new PerministerApiError(404, "Workspace not found.");
  return {
    organizationId: workspace.organizationId,
    scopeKind: "workspace",
    resourceId: workspaceId,
  };
}

function perministerMemberPath(userId: string): string {
  return `/api/auth/consumer/members/${encodeURIComponent(userId)}`;
}

async function runPerministerMemberAction(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
  successMessage: string,
): Promise<UserManagementResult> {
  try {
    await requestPerminister(path, { method, body });
    return success(successMessage);
  } catch (error) {
    return failure(perminResponseMessage(error));
  }
}

async function runWorkspaceMemberAction(
  input: { workspaceId: string; userId: string },
  method: "PATCH" | "DELETE",
  changes: Record<string, unknown>,
  successMessage: string,
): Promise<UserManagementResult> {
  try {
    return await runPerministerMemberAction(
      perministerMemberPath(input.userId),
      method,
      { ...await consumerWorkspaceScope(input.workspaceId), ...changes },
      successMessage,
    );
  } catch (error) {
    return failure(perminResponseMessage(error));
  }
}

function setWorkspaceMemberStatus(
  input: { workspaceId: string; userId: string },
  status: "active" | "disabled",
  successMessage: string,
): Promise<UserManagementResult> {
  return runWorkspaceMemberAction(input, "PATCH", { status }, successMessage);
}

export async function createWorkspaceUser(input: {
  workspaceId: string;
  email: string;
  password: string;
  role: string;
}): Promise<UserManagementResult> {
  const email = normalizeEmail(input.email);
  if (!email) return failure("Enter a valid email address (up to 254 characters).");
  if (!validPassword(input.password))
    return failure("Use a password between 15 and 256 characters.");
  const role = roleSchema.safeParse(input.role);
  if (!role.success) return failure("Choose either the admin or viewer role.");

  try {
    const result = await requestPerminister<{
      accountCreated: boolean;
      member: { subjectId: string };
    }>("/api/auth/consumer/members", {
      method: "POST",
      body: {
        ...await consumerWorkspaceScope(input.workspaceId),
        email,
        password: input.password,
        role: role.data,
      },
    });
    return success(
      result.accountCreated
        ? "User added. Share the initial password with them securely."
        : "Existing Perminister account added to this workspace; their current password is unchanged.",
    );
  } catch (error) {
    return failure(perminResponseMessage(error));
  }
}

export async function changeWorkspaceUserRole(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
  role: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot change your own account here.");
  const role = roleSchema.safeParse(input.role);
  if (!role.success) return failure("Choose either the admin or viewer role.");
  return runWorkspaceMemberAction(input, "PATCH", { role: role.data }, "User role updated.");
}

export async function resetWorkspaceUserPassword(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
  password: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot reset your own password here.");
  if (!validPassword(input.password))
    return failure("Use a password between 15 and 256 characters.");
  return runWorkspaceMemberAction(
    input,
    "PATCH",
    { password: input.password },
    "Password reset. The user must sign in again with the new password.",
  );
}

export async function deactivateWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot deactivate your own account here.");
  return setWorkspaceMemberStatus(input, "disabled", "User removed from this workspace.");
}

export async function reactivateWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot reactivate your own account here.");
  return setWorkspaceMemberStatus(input, "active", "User reactivated for this workspace.");
}

export async function deleteWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot delete your own account here.");
  return runWorkspaceMemberAction(input, "DELETE", {}, "User removed from this workspace.");
}
