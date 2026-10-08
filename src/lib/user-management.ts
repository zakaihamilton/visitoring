import { hash, verify } from "@node-rs/argon2";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authSessions, users, workspaces } from "@/db/schema";
import { createToken } from "@/lib/crypto";
import { PerministerApiError, requestPerminister, usesPerministerAuth } from "@/lib/perminister";

const emailSchema = z.string().email().max(254);
const roleSchema = z.enum(["admin", "viewer"]);
const dummyPasswordHash = hash(createToken());

export type UserManagementResult = { message: string; error?: boolean };
type UserManagementTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type WorkspaceUserChanges = {
  role?: "admin" | "viewer";
  isActive?: boolean;
  passwordHash?: string;
};

type UserTarget = { id: string; role: string; isActive: boolean };

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
  return value.length >= 12 && value.length <= 1024;
}

async function lockWorkspace(tx: UserManagementTransaction, workspaceId: string): Promise<void> {
  await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .for("update");
}

async function findWorkspaceUser(
  tx: UserManagementTransaction,
  workspaceId: string,
  userId: string,
): Promise<UserTarget | null> {
  const [target] = await tx
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.workspaceId, workspaceId)))
    .limit(1);
  return target ?? null;
}

async function lockAndFindWorkspaceUser(
  tx: UserManagementTransaction,
  workspaceId: string,
  userId: string,
): Promise<UserTarget | null> {
  await lockWorkspace(tx, workspaceId);
  return findWorkspaceUser(tx, workspaceId, userId);
}

async function updateWorkspaceUser(
  tx: UserManagementTransaction,
  workspaceId: string,
  userId: string,
  changes: WorkspaceUserChanges,
  expectedActive?: boolean,
): Promise<{ id: string } | null> {
  const conditions = [eq(users.id, userId), eq(users.workspaceId, workspaceId)];
  if (expectedActive !== undefined) conditions.push(eq(users.isActive, expectedActive));
  const [updated] = await tx
    .update(users)
    .set(changes)
    .where(and(...conditions))
    .returning({ id: users.id });
  return updated ?? null;
}

async function isLastActiveAdmin(
  tx: UserManagementTransaction,
  workspaceId: string,
  target: UserTarget,
): Promise<boolean> {
  if (target.role !== "admin" || !target.isActive) return false;
  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(eq(users.workspaceId, workspaceId), eq(users.role, "admin"), eq(users.isActive, true)),
    );
  return (result?.count ?? 0) <= 1;
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

function perminPasswordIsValid(value: string): boolean {
  return value.length >= 15 && value.length <= 256;
}

function consumerWorkspaceScope(workspaceId: string) {
  return {
    organizationId: process.env.PERMINISTER_ORGANIZATION_ID?.trim() ?? "",
    scopeKind: "workspace",
    resourceId: workspaceId,
  };
}

function perministerMemberPath(userId: string): string {
  return `/api/auth/consumer/members/${encodeURIComponent(userId)}`;
}

function runPerministerWorkspaceMemberAction(
  input: { workspaceId: string; userId: string },
  method: "PATCH" | "DELETE",
  changes: Record<string, unknown>,
  successMessage: string,
): Promise<UserManagementResult> {
  return runPerministerMemberAction(
    perministerMemberPath(input.userId),
    method,
    { ...consumerWorkspaceScope(input.workspaceId), ...changes },
    successMessage,
  );
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

function setPerministerWorkspaceUserStatus(
  input: { workspaceId: string; userId: string },
  status: "active" | "disabled",
  successMessage: string,
): Promise<UserManagementResult> {
  return runPerministerWorkspaceMemberAction(input, "PATCH", { status }, successMessage);
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
    return failure("Use a password between 12 and 1024 characters.");
  const role = roleSchema.safeParse(input.role);
  if (!role.success) return failure("Choose either the admin or viewer role.");
  if (usesPerministerAuth()) {
    if (!perminPasswordIsValid(input.password))
      return failure("Use a password between 15 and 256 characters.");
    try {
      const result = await requestPerminister<{
        accountCreated: boolean;
        member: { subjectId: string };
      }>("/api/auth/consumer/members", {
        method: "POST",
        body: {
          ...consumerWorkspaceScope(input.workspaceId),
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

  const passwordHash = await hash(input.password);
  const [created] = await db
    .insert(users)
    .values({
      workspaceId: input.workspaceId,
      email,
      passwordHash,
      role: role.data,
      isActive: true,
    })
    .onConflictDoNothing({ target: [users.workspaceId, users.email] })
    .returning({ id: users.id });
  if (!created) return failure("An account with that email already exists in this project.");
  return success("User added. Share their project name, email, and password with them securely.");
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
  if (usesPerministerAuth()) {
    return runPerministerWorkspaceMemberAction(
      input,
      "PATCH",
      { role: role.data },
      "User role updated.",
    );
  }

  return db.transaction(async (tx) => {
    const target = await lockAndFindWorkspaceUser(tx, input.workspaceId, input.userId);
    if (!target) return failure("That user is not in your project.");
    if (target.role === role.data) return success("That user already has this role.");
    if (role.data !== "admin" && (await isLastActiveAdmin(tx, input.workspaceId, target)))
      return failure("Your project must have at least one active admin.");

    const updated = await updateWorkspaceUser(tx, input.workspaceId, input.userId, {
      role: role.data,
    });
    return updated ? success("User role updated.") : failure("That user is not in your project.");
  });
}

export async function resetWorkspaceUserPassword(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
  password: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot reset your own password here.");
  if (usesPerministerAuth()) {
    if (!perminPasswordIsValid(input.password))
      return failure("Use a password between 15 and 256 characters.");
    return runPerministerWorkspaceMemberAction(
      input,
      "PATCH",
      { password: input.password },
      "Password reset. The user must sign in again with the new password.",
    );
  }
  if (!validPassword(input.password))
    return failure("Use a password between 12 and 1024 characters.");

  const passwordHash = await hash(input.password);
  return db.transaction(async (tx) => {
    const updated = await updateWorkspaceUser(tx, input.workspaceId, input.userId, {
      passwordHash,
    });
    if (!updated) return failure("That user is not in your project.");
    await tx.delete(authSessions).where(eq(authSessions.userId, input.userId));
    return success("Password reset. The user must sign in again with the new password.");
  });
}

export async function deactivateWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot deactivate your own account here.");
  if (usesPerministerAuth()) {
    return setPerministerWorkspaceUserStatus(
      input,
      "disabled",
      "User removed from this workspace.",
    );
  }

  return db.transaction(async (tx) => {
    const target = await lockAndFindWorkspaceUser(tx, input.workspaceId, input.userId);
    if (!target) return failure("That user is not in your project.");
    if (!target.isActive) return success("That user is already inactive.");
    if (await isLastActiveAdmin(tx, input.workspaceId, target))
      return failure("Your project must have at least one active admin.");

    const updated = await updateWorkspaceUser(tx, input.workspaceId, input.userId, {
      isActive: false,
    });
    if (!updated) return failure("That user is not in your project.");
    await tx.delete(authSessions).where(eq(authSessions.userId, input.userId));
    return success("User deactivated and signed out.");
  });
}

export async function reactivateWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot reactivate your own account here.");
  if (usesPerministerAuth()) {
    return setPerministerWorkspaceUserStatus(
      input,
      "active",
      "User reactivated for this workspace.",
    );
  }

  return db.transaction(async (tx) => {
    await lockWorkspace(tx, input.workspaceId);
    const updated = await updateWorkspaceUser(
      tx,
      input.workspaceId,
      input.userId,
      { isActive: true },
      false,
    );
    return updated
      ? success("User reactivated. They can sign in with their existing password.")
      : failure("That inactive user is not in your project.");
  });
}

export async function deleteWorkspaceUser(input: {
  actorId: string;
  workspaceId: string;
  userId: string;
}): Promise<UserManagementResult> {
  if (cannotChangeSelf(input.actorId, input.userId))
    return failure("You cannot delete your own account here.");
  if (usesPerministerAuth()) {
    return runPerministerWorkspaceMemberAction(
      input,
      "DELETE",
      {},
      "User removed from this workspace.",
    );
  }

  return db.transaction(async (tx) => {
    const target = await lockAndFindWorkspaceUser(tx, input.workspaceId, input.userId);
    if (!target) return failure("That user is not in your project.");
    if (await isLastActiveAdmin(tx, input.workspaceId, target))
      return failure("Your project must have at least one active admin.");

    const [deleted] = await tx
      .delete(users)
      .where(and(eq(users.id, input.userId), eq(users.workspaceId, input.workspaceId)))
      .returning({ id: users.id });
    return deleted
      ? success("User permanently deleted.")
      : failure("That user is not in your project.");
  });
}

export async function authenticateWorkspaceUser(input: {
  email: string;
  workspaceSlug: string;
  password: string;
}): Promise<{ id: string; passwordHash: string } | null> {
  const email = normalizeEmail(input.email);
  if (!email || !input.workspaceSlug) return null;
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .innerJoin(workspaces, eq(users.workspaceId, workspaces.id))
    .where(
      and(
        eq(users.email, email),
        eq(workspaces.slug, input.workspaceSlug.toLowerCase()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordMatches = await verify(passwordHash, input.password);
  if (!user || !passwordMatches) return null;
  return { id: user.id, passwordHash: user.passwordHash };
}
