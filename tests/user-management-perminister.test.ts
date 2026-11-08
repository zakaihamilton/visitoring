import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPerminister: vi.fn(),
  consumerProjectScope: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/perminister", () => ({
  consumerProjectScope: mocks.consumerProjectScope,
  PerministerApiError: class PerministerApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
  requestPerminister: mocks.requestPerminister,
}));

import {
  changeProjectUserRole,
  createProjectUser,
  deactivateProjectUser,
  deleteProjectUser,
  reactivateProjectUser,
  resetProjectUserPassword,
} from "@/lib/user-management";
import { PerministerApiError } from "@/lib/perminister";

const scope = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  scopeKind: "project",
  resourceId: "project-id",
};

const memberPath = "/api/auth/consumer/members";
const subjectPath = `${memberPath}/22222222-2222-4222-8222-222222222222`;

beforeEach(() => {
  mocks.consumerProjectScope.mockResolvedValue(scope);
  mocks.requestPerminister.mockResolvedValue({ accountCreated: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Visitoring Perminister member management", () => {
  it("provisions email accounts in the selected project scope", async () => {
    await expect(
      createProjectUser({
        projectId: scope.resourceId,
        email: "person@example.com",
        password: "a-secure-password-123",
        role: "admin",
      }),
    ).resolves.toEqual({
      message: "User added. Share the initial password with them securely.",
    });
    expect(mocks.requestPerminister).toHaveBeenCalledWith(memberPath, {
      method: "POST",
      body: {
        ...scope,
        email: "person@example.com",
        password: "a-secure-password-123",
        role: "admin",
      },
    });
  });

  it("routes role, password, status, and removal changes through the scoped member API", async () => {
    const target = "22222222-2222-4222-8222-222222222222";
    const input = { actorId: "actor-id", projectId: scope.resourceId, userId: target };

    await changeProjectUserRole({ ...input, role: "viewer" });
    await resetProjectUserPassword({ ...input, password: "another-secure-password-123" });
    await deactivateProjectUser(input);
    await reactivateProjectUser(input);
    await deleteProjectUser(input);

    expect(mocks.requestPerminister.mock.calls).toEqual([
      [subjectPath, { method: "PATCH", body: { ...scope, role: "viewer" } }],
      [
        subjectPath,
        { method: "PATCH", body: { ...scope, password: "another-secure-password-123" } },
      ],
      [subjectPath, { method: "PATCH", body: { ...scope, status: "disabled" } }],
      [subjectPath, { method: "PATCH", body: { ...scope, status: "active" } }],
      [subjectPath, { method: "DELETE", body: scope }],
    ]);
  });

  it("surfaces scoped administration errors from Perminister", async () => {
    mocks.requestPerminister.mockRejectedValue(
      new PerministerApiError(409, "The project must keep an active administrator."),
    );

    await expect(
      deactivateProjectUser({
        actorId: "actor-id",
        projectId: scope.resourceId,
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).resolves.toEqual({
      message: "The project must keep an active administrator.",
      error: true,
    });
  });
});
