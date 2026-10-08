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
  listPerministerWorkspaceMembers,
  loginWithPerminister,
  readPerministerSession,
  requestPerminister,
  visitoringUserForWorkspace,
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

  it("maps only a matching active workspace role into Visitoring context", async () => {
    dbLimit
      .mockResolvedValueOnce([
        {
          id: "workspace-id",
          name: "Acme",
          slug: "acme",
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
          ],
        },
      ],
    };

    await expect(visitoringUserForWorkspace(auth, "ACME")).resolves.toEqual({
      id: "subject-id",
      workspaceId: "workspace-id",
      workspaceName: "Acme",
      workspaceSlug: "acme",
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme Organization",
      email: null,
      role: "viewer",
    });
    await expect(visitoringUserForWorkspace(auth, "missing")).resolves.toBeNull();
  });
});
