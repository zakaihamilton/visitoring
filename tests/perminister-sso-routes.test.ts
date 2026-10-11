import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  authorizationUrl: vi.fn(),
  clientSecret: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
  revokePerministerSession: vi.fn(),
  visitoringOrganizations: vi.fn(),
  setSessionCookie: vi.fn(),
  setInitialVisitoringOrganization: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/perminister", () => ({
  perministerAuthorizationUrl: mocks.authorizationUrl,
  perministerClientSecretForSso: mocks.clientSecret,
  exchangePerministerAuthorizationCode: mocks.exchangeAuthorizationCode,
  revokePerministerSession: mocks.revokePerministerSession,
  visitoringOrganizations: mocks.visitoringOrganizations,
}));
vi.mock("@/lib/auth", () => ({ setSessionCookie: mocks.setSessionCookie }));
vi.mock("@/lib/organization-cookies", () => ({
  setInitialVisitoringOrganization: mocks.setInitialVisitoringOrganization,
}));

import { GET as startPerministerSso } from "@/app/auth/perminister/start/route";
import { GET as finishPerministerSso } from "@/app/auth/perminister/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clientSecret.mockReturnValue("test-client-secret");
  mocks.authorizationUrl.mockImplementation(
    (state: string, challenge: string, origin: string) =>
      `https://perminister.test/oauth/authorize?${new URLSearchParams({ state, challenge, origin })}`,
  );
  mocks.visitoringOrganizations.mockReturnValue([
    {
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme",
    },
  ]);
});

describe("Perminister SSO organization selection", () => {
  it("starts and completes SSO without an organization parameter", async () => {
    const startResponse = await startPerministerSso(
      new Request("https://visitoring.test/auth/perminister/start"),
    );
    const authorization = new URL(startResponse.headers.get("location") ?? "");
    const state = authorization.searchParams.get("state");
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorization.searchParams.has("organizationId")).toBe(false);
    expect(mocks.authorizationUrl).toHaveBeenCalledWith(
      state,
      expect.any(String),
      "https://visitoring.test",
    );

    const cookieName = `visitoring_sso-${state}`;
    const cookieValue = startResponse.cookies.get(cookieName)?.value;
    mocks.cookies.mockResolvedValue({
      get: (name: string) => (name === cookieName ? { value: cookieValue } : undefined),
    });
    mocks.exchangeAuthorizationCode.mockResolvedValue({ sessionToken: "sso-session-token" });

    const callbackResponse = await finishPerministerSso(
      new Request(
        `https://visitoring.test/auth/perminister/callback?code=authorization-code&state=${state}`,
      ),
    );

    expect(callbackResponse.status).toBe(303);
    expect(callbackResponse.headers.get("location")).toBe("https://visitoring.test/projects");
    expect(mocks.exchangeAuthorizationCode).toHaveBeenCalledWith(
      "authorization-code",
      expect.any(String),
    );
    expect(mocks.setInitialVisitoringOrganization).toHaveBeenCalledWith(
      mocks.visitoringOrganizations.mock.results[0]?.value,
    );
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("sso-session-token");
  });

  it("revokes the exchanged session when it has no Visitoring organization", async () => {
    const startResponse = await startPerministerSso(
      new Request("https://visitoring.test/auth/perminister/start"),
    );
    const authorization = new URL(startResponse.headers.get("location") ?? "");
    const state = authorization.searchParams.get("state") ?? "";
    const cookieName = `visitoring_sso-${state}`;
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === cookieName ? { value: startResponse.cookies.get(cookieName)?.value } : undefined,
    });
    mocks.exchangeAuthorizationCode.mockResolvedValue({ sessionToken: "unscoped-token" });
    mocks.visitoringOrganizations.mockReturnValue([]);

    const callbackResponse = await finishPerministerSso(
      new Request(
        `https://visitoring.test/auth/perminister/callback?code=authorization-code&state=${state}`,
      ),
    );

    expect(callbackResponse.headers.get("location")).toBe(
      "https://visitoring.test/login?error=invalid",
    );
    expect(mocks.revokePerministerSession).toHaveBeenCalledWith("unscoped-token");
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });
});
