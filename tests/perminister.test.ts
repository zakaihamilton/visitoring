import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbSelect, dbFrom, dbWhere, dbLimit } = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbFrom: vi.fn(),
  dbWhere: vi.fn(),
  dbLimit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: dbSelect } }));

import { cookies } from "next/headers";
import {
  bootstrapVisitoringWorkspaceAdmin,
  isVisitoringOrganizationAdmin,
  listPerministerWorkspaceMembers,
  loginWithPerminister,
  readPerministerSession,
  revokeVisitoringWorkspaceGrants,
  requestPerminister,
  visitoringOrganizations,
  visitoringUserForWorkspace,
  visitoringWorkspacesForOrganization,
} from "@/lib/perminister";

function configureEnvironment(): void {
  vi.stubEnv("PERMINISTER_BASE_URL", "https://www.perminister.com");
  vi.stubEnv("PERMINISTER_APP_CLIENT_ID", "dynamic-client-id");
  vi.stubEnv("PERMINISTER_APP_CLIENT_SECRET", "a-secret-value");
  vi.stubEnv("PERMINISTER_PRODUCT_ID", "visitoring");
  vi.stubEnv("NODE_ENV", "test");
}

describe("Visitoring Perminister client", () => {
  beforeEach(() => {
    configureEnvironment();
    dbLimit.mockReset();
    dbSelect.mockReturnValue({ from: dbFrom });
    dbFrom.mockReturnValue({ where: dbWhere });
    dbWhere.mockReturnValue({ limit: dbLimit });
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === "visitoring_session" ? { value: "opaque-session-token" } : undefined,
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends login only from the server with the dynamic client credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        authenticated: true,
        sessionToken: "issued-token",
        account: { subjectId: "subject-id", email: "person@example.com" },
        organizations: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await loginWithPerminister("person@example.com", "legacy-password");

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = new Headers(init.headers);
    expect(url.toString()).toBe("https://www.perminister.com/api/auth/consumer/login");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    expect(headers.get("X-Perminister-Client-Id")).toBe("dynamic-client-id");
    expect(headers.get("X-Perminister-Client-Secret")).toBe("a-secret-value");
    expect(headers.has("Authorization")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual({
      identifier: "person@example.com",
      password: "legacy-password",
    });
  });

  it("lists the unique Visitoring organizations in name order", () => {
    const auth = {
      authenticated: true as const,
      account: { subjectId: "subject-id", email: null },
      organizations: [
        {
          organizationId: "22222222-2222-4222-8222-222222222222",
          organizationName: "Northwind",
          organizationRole: "member" as const,
          productId: "visitoring",
          resourceRoles: [],
        },
        {
          organizationId: "11111111-1111-4111-8111-111111111111",
          organizationName: "Acme",
          organizationRole: "owner" as const,
          productId: "visitoring",
          resourceRoles: [],
        },
        {
          organizationId: "33333333-3333-4333-8333-333333333333",
          organizationName: "Other product",
          organizationRole: "admin" as const,
          productId: "other-product",
          resourceRoles: [],
        },
        {
          organizationId: "22222222-2222-4222-8222-222222222222",
          organizationName: "Duplicate",
          organizationRole: "member" as const,
          productId: "visitoring",
          resourceRoles: [],
        },
      ],
    };

    expect(visitoringOrganizations(auth)).toEqual([
      {
        organizationId: "11111111-1111-4111-8111-111111111111",
        organizationName: "Acme",
      },
      {
        organizationId: "22222222-2222-4222-8222-222222222222",
        organizationName: "Northwind",
      },
    ]);
  });

  it("uses the current opaque session for protected calls and returns API errors safely", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ authenticated: true, account: {}, organizations: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await readPerministerSession("opaque-session-token");
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer opaque-session-token");

    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "invalid_credentials" }, { status: 401 }),
    );
    await expect(
      requestPerminister("/api/auth/consumer/session", { token: "bad-token" }),
    ).rejects.toMatchObject({
      status: 401,
      message: "invalid_credentials",
    });
  });

  it("lists only the requested workspace through the authenticated member API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        members: [
          {
            subjectId: "subject-id",
            email: "person@example.com",
            role: "admin",
            active: true,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    dbLimit.mockResolvedValueOnce([{ organizationId: "11111111-1111-4111-8111-111111111111" }]);

    await expect(listPerministerWorkspaceMembers("workspace-id")).resolves.toEqual([
      { id: "subject-id", email: "person@example.com", role: "admin", isActive: true },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe("/api/auth/consumer/members");
    expect(url.searchParams.get("organizationId")).toBe("11111111-1111-4111-8111-111111111111");
    expect(url.searchParams.get("scopeKind")).toBe("workspace");
    expect(url.searchParams.get("resourceId")).toBe("workspace-id");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer opaque-session-token");
  });

  it("lists accessible workspaces and maps a selected workspace into Visitoring context", async () => {
    dbLimit
      .mockResolvedValueOnce([
        {
          id: "workspace-id",
          name: "ShiftingFront",
          organizationId: "11111111-1111-4111-8111-111111111111",
        },
        {
          id: "other-workspace-id",
          name: "Puzzimori",
          organizationId: "11111111-1111-4111-8111-111111111111",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "workspace-id",
          name: "ShiftingFront",
          organizationId: "11111111-1111-4111-8111-111111111111",
        },
      ])
      .mockResolvedValueOnce([]);
    const auth = {
      authenticated: true as const,
      account: { subjectId: "subject-id", email: null },
      organizations: [
        {
          organizationId: "11111111-1111-4111-8111-111111111111",
          organizationName: "Acme Organization",
          organizationRole: "owner" as const,
          productId: "visitoring",
          resourceRoles: [
            {
              scope: {
                kind: "workspace",
                organizationId: "11111111-1111-4111-8111-111111111111",
                productId: "visitoring",
                workspaceId: "workspace-id",
              },
              role: "viewer",
              actions: ["visitoring:workspace:read"],
            },
            {
              scope: {
                kind: "workspace",
                organizationId: "11111111-1111-4111-8111-111111111111",
                productId: "visitoring",
                workspaceId: "other-workspace-id",
              },
              role: "admin",
              actions: ["visitoring:workspace:read"],
            },
          ],
        },
      ],
    };

    await expect(
      visitoringWorkspacesForOrganization(auth, "11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual([
      {
        id: "other-workspace-id",
        name: "Puzzimori",
        organizationId: "11111111-1111-4111-8111-111111111111",
        organizationName: "Acme Organization",
        role: "admin",
      },
      {
        id: "workspace-id",
        name: "ShiftingFront",
        organizationId: "11111111-1111-4111-8111-111111111111",
        organizationName: "Acme Organization",
        role: "viewer",
      },
    ]);

    await expect(
      visitoringUserForWorkspace(auth, "11111111-1111-4111-8111-111111111111", "workspace-id"),
    ).resolves.toEqual({
      id: "subject-id",
      workspaceId: "workspace-id",
      workspaceName: "ShiftingFront",
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme Organization",
      email: null,
      role: "viewer",
    });
    await expect(
      visitoringUserForWorkspace(auth, "11111111-1111-4111-8111-111111111111", "missing"),
    ).resolves.toBeNull();

    expect(isVisitoringOrganizationAdmin(auth, "11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("uses scoped Perminister operations to bootstrap and revoke workspace grants", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ granted: true }))
      .mockResolvedValueOnce(Response.json({ revoked: true }));
    vi.stubGlobal("fetch", fetchMock);
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const workspaceId = "22222222-2222-4222-8222-222222222222";

    await bootstrapVisitoringWorkspaceAdmin(organizationId, workspaceId);
    await revokeVisitoringWorkspaceGrants(organizationId, workspaceId);

    const [bootstrapUrl, bootstrapInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(bootstrapUrl.pathname).toBe("/api/auth/consumer/workspaces");
    expect(bootstrapInit.method).toBe("POST");
    expect(JSON.parse(String(bootstrapInit.body))).toEqual({ organizationId, workspaceId });

    const [revokeUrl, revokeInit] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(revokeUrl.pathname).toBe(`/api/auth/consumer/workspaces/${workspaceId}`);
    expect(revokeInit.method).toBe("DELETE");
    expect(JSON.parse(String(revokeInit.body))).toEqual({ organizationId });
  });

  it("requires explicit confirmation from Perminister before treating cleanup as complete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ granted: false }))
      .mockResolvedValueOnce(Response.json({ revoked: false }));
    vi.stubGlobal("fetch", fetchMock);
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const workspaceId = "22222222-2222-4222-8222-222222222222";

    await expect(
      bootstrapVisitoringWorkspaceAdmin(organizationId, workspaceId),
    ).rejects.toMatchObject({
      status: 503,
    });
    await expect(
      revokeVisitoringWorkspaceGrants(organizationId, workspaceId),
    ).rejects.toMatchObject({
      status: 503,
    });
  });
});
