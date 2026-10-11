import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  readPerministerSession: vi.fn(),
  visitoringOrganizationForId: vi.fn(),
  isVisitoringOrganizationAdmin: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/perminister", () => ({
  PERMINISTER_SESSION_COOKIE: "visitoring_session",
  PerministerApiError: class PerministerApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
  hasVisitoringOrganization: vi.fn(),
  isVisitoringOrganizationAdmin: mocks.isVisitoringOrganizationAdmin,
  readPerministerSession: mocks.readPerministerSession,
  revokePerministerSession: vi.fn(),
  visitoringOrganizationForId: mocks.visitoringOrganizationForId,
  visitoringUserForWorkspace: vi.fn(),
  visitoringWorkspacesForOrganization: vi.fn(),
}));

import { requireOrganizationAdmin } from "@/lib/auth";

const organizationId = "11111111-1111-4111-8111-111111111111";

function session(role: "owner" | "admin" | "member") {
  return {
    authenticated: true,
    account: { subjectId: "22222222-2222-4222-8222-222222222222", email: "admin@example.com" },
    organizations: [
      {
        organizationId,
        organizationName: "Acme",
        organizationRole: role,
        productId: "visitoring",
        resourceRoles: [],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  const get = vi.fn((name: string) => {
    if (name === "visitoring_session") return { value: "current-session" };
    if (name === "visitoring_organization_id") return { value: organizationId };
    return undefined;
  });
  mocks.cookies.mockResolvedValue({ get });
  mocks.readPerministerSession.mockResolvedValue(session("admin"));
  mocks.visitoringOrganizationForId.mockImplementation(
    (currentSession, id) =>
      currentSession.organizations.find(
        (organization: { organizationId: string }) => organization.organizationId === id,
      ) ?? null,
  );
  mocks.isVisitoringOrganizationAdmin.mockImplementation(
    (currentSession) =>
      currentSession.organizations[0]?.organizationRole === "owner" ||
      currentSession.organizations[0]?.organizationRole === "admin",
  );
});

describe("organization project management authorization", () => {
  it.each(["owner", "admin"] as const)(
    "allows organization %s without a selected workspace",
    async (role) => {
      mocks.readPerministerSession.mockResolvedValue(session(role));

      await expect(requireOrganizationAdmin()).resolves.toMatchObject({
        actorId: "22222222-2222-4222-8222-222222222222",
        organizationId,
        organizationName: "Acme",
      });
      const cookieStore = await mocks.cookies.mock.results[0]?.value;
      const get = cookieStore?.get as ReturnType<typeof vi.fn>;
      expect(get).not.toHaveBeenCalledWith("visitoring_workspace_id");
    },
  );

  it("rejects organization members from project management", async () => {
    mocks.readPerministerSession.mockResolvedValue(session("member"));

    await expect(requireOrganizationAdmin()).rejects.toThrow("redirect:/projects?error=forbidden");
  });
});
