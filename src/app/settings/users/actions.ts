"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  changeWorkspaceUserRole,
  createWorkspaceUser,
  deactivateWorkspaceUser,
  deleteWorkspaceUser,
  reactivateWorkspaceUser,
  resetWorkspaceUserPassword,
  type UserManagementResult,
} from "@/lib/user-management";

export type UserActionState = UserManagementResult;

async function refreshOnSuccess(result: UserManagementResult): Promise<UserManagementResult> {
  if (!result.error) revalidatePath("/settings/users");
  return result;
}

export async function createUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await createWorkspaceUser({
      workspaceId: admin.workspaceId,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "viewer"),
    }),
  );
}

export async function changeUserRoleAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await changeWorkspaceUserRole({
      actorId: admin.id,
      workspaceId: admin.workspaceId,
      userId: String(formData.get("userId") ?? ""),
      role: String(formData.get("role") ?? ""),
    }),
  );
}

export async function resetUserPasswordAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await resetWorkspaceUserPassword({
      actorId: admin.id,
      workspaceId: admin.workspaceId,
      userId: String(formData.get("userId") ?? ""),
      password: String(formData.get("password") ?? ""),
    }),
  );
}

export async function deactivateUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await deactivateWorkspaceUser({
      actorId: admin.id,
      workspaceId: admin.workspaceId,
      userId: String(formData.get("userId") ?? ""),
    }),
  );
}

export async function reactivateUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await reactivateWorkspaceUser({
      actorId: admin.id,
      workspaceId: admin.workspaceId,
      userId: String(formData.get("userId") ?? ""),
    }),
  );
}

export async function deleteUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  return refreshOnSuccess(
    await deleteWorkspaceUser({
      actorId: admin.id,
      workspaceId: admin.workspaceId,
      userId: String(formData.get("userId") ?? ""),
    }),
  );
}
