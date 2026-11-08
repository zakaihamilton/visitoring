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
  bootstrapVisitoringProjectAdmin,
  isVisitoringOrganizationAdmin,
  listPerministerProjectMembers,
  loginWithPerminister,
  readPerministerSession,
  revokeVisitoringProjectGrants,
  requestPerminister,
  visitoringOrganizations,
  visitoringUserForProject,
  visitoringProjectsForOrganization,
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

  it("logs upstream failures with safe operation metadata", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "failure for person@example.com" }, { status: 503 }),
      );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestPerminister("/api/auth/consumer/session", { token: "private-session-token" }),
    ).rejects.toMatchObject({ status: 503 });

    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({
      event: "perminister_request_failed",
      dependency: "perminister",
      operation: "session",
      method: "GET",
      failure: "upstream",
      status: 503,
    });
    expect(entry.durationMs).toEqual(expect.any(Number));
    expect(JSON.stringify(entry)).not.toContain("a-secret-value");
    expect(JSON.stringify(entry)).not.toContain("private-session-token");
    expect(JSON.stringify(entry)).not.toContain("person@example.com");
  });

  it("distinguishes timeouts and transport failures without logging request data", async () => {
    const timeout = Object.assign(new Error("private-session-token timed out"), {
      name: "TimeoutError",
    });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(timeout)
      .mockRejectedValueOnce(new TypeError("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestPerminister("/api/auth/consumer/session", { token: "private-session-token" }),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      requestPerminister("/api/auth/consumer/session", { token: "private-session-token" }),
    ).rejects.toMatchObject({ status: 503 });

    const bodyTimeout = Object.assign(new Error("private-session-token timed out"), {
      name: "TimeoutError",
    });
    vi.spyOn(AbortSignal, "timeout").mockReturnValue({
      aborted: true,
      reason: bodyTimeout,
    } as AbortSignal);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(bodyTimeout),
    } as Response);
    await expect(
      requestPerminister("/api/auth/consumer/session", { token: "private-session-token" }),
    ).rejects.toMatchObject({ status: 503 });

    expect(log).toHaveBeenCalledTimes(3);
    const entries = log.mock.calls.map(([message]) => JSON.parse(String(message)));
    expect(entries.map((entry) => entry.failure)).toEqual(["timeout", "transport", "timeout"]);
    expect(entries.map((entry) => entry.status)).toEqual([null, null, 200]);
    for (const entry of entries) {
      expect(entry.durationMs).toEqual(expect.any(Number));
      expect(JSON.stringify(entry)).not.toContain("a-secret-value");
      expect(JSON.stringify(entry)).not.toContain("private-session-token");
    }
  });

  it("lists only the requested project through the authenticated member API", async () => {
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

    await expect(listPerministerProjectMembers("project-id")).resolves.toEqual([
      { id: "subject-id", email: "person@example.com", role: "admin", isActive: true },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe("/api/auth/consumer/members");
    expect(url.searchParams.get("organizationId")).toBe("11111111-1111-4111-8111-111111111111");
    expect(url.searchParams.get("scopeKind")).toBe("project");
    expect(url.searchParams.get("resourceId")).toBe("project-id");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer opaque-session-token");
  });

  it("lists accessible projects and maps a selected project into Visitoring context", async () => {
    dbLimit
      .mockResolvedValueOnce([
        {
          id: "project-id",
          name: "ShiftingFront",
          organizationId: "11111111-1111-4111-8111-111111111111",
        },
        {
          id: "other-project-id",
          name: "Puzzimori",
          organizationId: "11111111-1111-4111-8111-111111111111",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "project-id",
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
          organizationRole: "member" as const,
          productId: "visitoring",
          resourceRoles: [
            {
              scope: {
                kind: "project",
                organizationId: "11111111-1111-4111-8111-111111111111",
                productId: "visitoring",
                projectId: "project-id",
              },
              role: "viewer",
              actions: ["visitoring:project:read"],
            },
            {
              scope: {
                kind: "project",
                organizationId: "11111111-1111-4111-8111-111111111111",
                productId: "visitoring",
                projectId: "other-project-id",
              },
              role: "admin",
              actions: ["visitoring:project:read"],
            },
          ],
        },
      ],
    };

    await expect(
      visitoringProjectsForOrganization(auth, "11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual([
      {
        id: "other-project-id",
        name: "Puzzimori",
        organizationId: "11111111-1111-4111-8111-111111111111",
        organizationName: "Acme Organization",
        role: "admin",
      },
      {
        id: "project-id",
        name: "ShiftingFront",
        organizationId: "11111111-1111-4111-8111-111111111111",
        organizationName: "Acme Organization",
        role: "viewer",
      },
    ]);

    await expect(
      visitoringUserForProject(auth, "11111111-1111-4111-8111-111111111111", "project-id"),
    ).resolves.toEqual({
      id: "subject-id",
      projectId: "project-id",
      projectName: "ShiftingFront",
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme Organization",
      email: null,
      role: "viewer",
    });
    await expect(
      visitoringUserForProject(auth, "11111111-1111-4111-8111-111111111111", "missing"),
    ).resolves.toBeNull();

    expect(isVisitoringOrganizationAdmin(auth, "11111111-1111-4111-8111-111111111111")).toBe(false);
    const organizationOwnerAuth = {
      ...auth,
      organizations: auth.organizations.map((organization) => ({
        ...organization,
        organizationRole: "owner" as const,
      })),
    };
    expect(
      isVisitoringOrganizationAdmin(organizationOwnerAuth, "11111111-1111-4111-8111-111111111111"),
    ).toBe(true);
  });

  it("uses scoped Perminister operations to bootstrap and revoke project grants", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ granted: true }))
      .mockResolvedValueOnce(Response.json({ revoked: true }))
      .mockResolvedValueOnce(Response.json({ revoked: true }));
    vi.stubGlobal("fetch", fetchMock);
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";

    await bootstrapVisitoringProjectAdmin(organizationId, projectId);
    await revokeVisitoringProjectGrants(organizationId, projectId);

    const [bootstrapUrl, bootstrapInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(bootstrapUrl.pathname).toBe("/api/auth/consumer/projects");
    expect(bootstrapInit.method).toBe("POST");
    expect(JSON.parse(String(bootstrapInit.body))).toEqual({ organizationId, projectId });

    const [revokeUrl, revokeInit] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(revokeUrl.pathname).toBe(`/api/auth/consumer/projects/${projectId}`);
    expect(revokeInit.method).toBe("DELETE");
    expect(JSON.parse(String(revokeInit.body))).toEqual({ organizationId });

    const [legacyRevokeUrl, legacyRevokeInit] = fetchMock.mock.calls[2] as [URL, RequestInit];
    expect(legacyRevokeUrl.pathname).toBe("/api/auth/consumer/workspaces/" + projectId);
    expect(legacyRevokeInit.method).toBe("DELETE");
    expect(JSON.parse(String(legacyRevokeInit.body))).toEqual({ organizationId });
  });

  it("requires explicit confirmation from Perminister before treating cleanup as complete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ granted: false }))
      .mockResolvedValueOnce(Response.json({ revoked: false }));
    vi.stubGlobal("fetch", fetchMock);
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";

    await expect(bootstrapVisitoringProjectAdmin(organizationId, projectId)).rejects.toMatchObject({
      status: 503,
    });
    await expect(revokeVisitoringProjectGrants(organizationId, projectId)).rejects.toMatchObject({
      status: 503,
    });
  });
});
