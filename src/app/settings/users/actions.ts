"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  changeProjectUserRole,
  createProjectUser,
  deactivateProjectUser,
  deleteProjectUser,
  reactivateProjectUser,
  resetProjectUserPassword,
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
    await createProjectUser({
      projectId: admin.projectId,
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
    await changeProjectUserRole({
      actorId: admin.id,
      projectId: admin.projectId,
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
    await resetProjectUserPassword({
      actorId: admin.id,
      projectId: admin.projectId,
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
    await deactivateProjectUser({
      actorId: admin.id,
      projectId: admin.projectId,
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
    await reactivateProjectUser({
      actorId: admin.id,
      projectId: admin.projectId,
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
    await deleteProjectUser({
      actorId: admin.id,
      projectId: admin.projectId,
      userId: String(formData.get("userId") ?? ""),
    }),
  );
}
