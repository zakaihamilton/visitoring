import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOrganizationAdmin: vi.fn(),
  bootstrapVisitoringWorkspaceAdmin: vi.fn(),
  revokeVisitoringWorkspaceGrants: vi.fn(),
  revalidatePath: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  delete: vi.fn(),
  deleteWhere: vi.fn(),
  deleteReturning: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("@/lib/auth", () => ({ requireOrganizationAdmin: mocks.requireOrganizationAdmin }));
vi.mock("@/lib/perminister", () => ({
  bootstrapVisitoringWorkspaceAdmin: mocks.bootstrapVisitoringWorkspaceAdmin,
  revokeVisitoringWorkspaceGrants: mocks.revokeVisitoringWorkspaceGrants,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createProjectAction,
  manageProjectAction,
  type ProjectActionState,
} from "@/app/projects/manage-actions";

const organizationId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const admin = {
  actorId: "33333333-3333-4333-8333-333333333333",
  email: "admin@example.com",
  organizationId,
  organizationName: "Acme",
};
const initial: ProjectActionState = { message: "" };

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireOrganizationAdmin.mockResolvedValue(admin);
  mocks.insert.mockReturnValue({ values: mocks.insertValues });
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: mocks.selectLimit }) }),
  });
  mocks.update.mockReturnValue({ set: mocks.updateSet });
  mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
  mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
  mocks.delete.mockReturnValue({ where: mocks.deleteWhere });
  mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning });
  mocks.updateReturning.mockResolvedValue([{ id: workspaceId }]);
  mocks.deleteReturning.mockResolvedValue([{ id: workspaceId }]);
  mocks.bootstrapVisitoringWorkspaceAdmin.mockResolvedValue(undefined);
  mocks.revokeVisitoringWorkspaceGrants.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("organization project management actions", () => {
  it("rechecks organization admin access before changing project data", async () => {
    mocks.requireOrganizationAdmin.mockRejectedValue(new Error("not an organization admin"));

    await expect(createProjectAction(initial, formData({ name: "Example" }))).rejects.toThrow(
      "not an organization admin",
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("creates a workspace and grants the creator admin access", async () => {
    const result = await createProjectAction(initial, formData({ name: "  Example  " }));

    expect(result).toEqual({
      message: "Example added. You now have admin access to its workspace.",
    });
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Example",
        organizationId,
        id: expect.any(String),
        archivedAt: expect.any(Date),
        deletionPendingAt: expect.any(Date),
      }),
    );
    const createdValues = mocks.insertValues.mock.calls[0]?.[0] as { id: string } | undefined;
    if (!createdValues) throw new Error("The workspace insert was not recorded.");
    const createdId = createdValues.id;
    expect(mocks.bootstrapVisitoringWorkspaceAdmin).toHaveBeenCalledWith(organizationId, createdId);
    expect(mocks.updateSet).toHaveBeenCalledWith({ archivedAt: null, deletionPendingAt: null });
  });

  it("archives an unusable project if initial grant setup fails", async () => {
    mocks.bootstrapVisitoringWorkspaceAdmin.mockRejectedValue(new Error("Perminister unavailable"));
    mocks.revokeVisitoringWorkspaceGrants.mockRejectedValue(new Error("Perminister unavailable"));

    const result = await createProjectAction(initial, formData({ name: "Example" }));

    expect(result).toMatchObject({
      error: true,
      message: expect.stringContaining("pending deletion"),
    });
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedAt: expect.any(Date),
        deletionPendingAt: expect.any(Date),
      }),
    );
  });

  it("does not permanently delete an active project", async () => {
    mocks.selectLimit.mockResolvedValue([
      {
        id: workspaceId,
        archivedAt: null,
        deletionPendingAt: null,
      },
    ]);

    await expect(
      manageProjectAction(initial, formData({ workspaceId, operation: "delete" })),
    ).resolves.toMatchObject({
      error: true,
      message: "Archive a project before deleting it permanently.",
    });
    expect(mocks.revokeVisitoringWorkspaceGrants).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("keeps an archived project retryable when Perminister cleanup fails", async () => {
    mocks.selectLimit.mockResolvedValue([
      {
        id: workspaceId,
        archivedAt: new Date(),
        deletionPendingAt: null,
      },
    ]);
    mocks.revokeVisitoringWorkspaceGrants.mockRejectedValue(new Error("Perminister unavailable"));

    await expect(
      manageProjectAction(initial, formData({ workspaceId, operation: "delete" })),
    ).resolves.toMatchObject({
      error: true,
      message: expect.stringContaining("cleanup is still pending"),
    });
    expect(mocks.updateReturning).toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("deletes an archived project after workspace grants have been revoked", async () => {
    mocks.selectLimit.mockResolvedValue([
      {
        id: workspaceId,
        archivedAt: new Date(),
        deletionPendingAt: new Date(),
      },
    ]);

    await expect(
      manageProjectAction(initial, formData({ workspaceId, operation: "delete" })),
    ).resolves.toEqual({
      message: "Project and its Visitoring analytics were permanently deleted.",
    });
    expect(mocks.revokeVisitoringWorkspaceGrants).toHaveBeenCalledWith(organizationId, workspaceId);
    expect(mocks.deleteReturning).toHaveBeenCalled();
  });
});
