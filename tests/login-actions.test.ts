import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  destroyAuthSession: vi.fn(),
  setSessionCookie: vi.fn(),
  clientIpFromHeaders: vi.fn(),
  clearLoginAccountAttempts: vi.fn(),
  isLoginRateLimited: vi.fn(),
  clearVisitoringOrganizationSelection: vi.fn(),
  makeVisitoringLastOrganizationCookieAvailable: vi.fn(),
  loginWithPerminister: vi.fn(),
  revokePerministerSession: vi.fn(),
  visitoringOrganizations: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  destroyAuthSession: mocks.destroyAuthSession,
  setSessionCookie: mocks.setSessionCookie,
}));
vi.mock("@/lib/privacy", () => ({ clientIpFromHeaders: mocks.clientIpFromHeaders }));
vi.mock("@/lib/login-rate-limit", () => ({
  clearLoginAccountAttempts: mocks.clearLoginAccountAttempts,
  isLoginRateLimited: mocks.isLoginRateLimited,
}));
vi.mock("@/lib/organization-cookies", () => ({
  clearVisitoringOrganizationSelection: mocks.clearVisitoringOrganizationSelection,
  makeVisitoringLastOrganizationCookieAvailable:
    mocks.makeVisitoringLastOrganizationCookieAvailable,
}));
vi.mock("@/lib/perminister", () => ({
  loginWithPerminister: mocks.loginWithPerminister,
  PerministerApiError: class PerministerApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
  revokePerministerSession: mocks.revokePerministerSession,
  visitoringOrganizations: mocks.visitoringOrganizations,
}));

import { loginAction, startPerministerLoginAction } from "@/app/login/actions";

function loginForm(email = "Person@Example.com", password = "secret") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(new Headers());
  mocks.clientIpFromHeaders.mockReturnValue("203.0.113.5");
  mocks.isLoginRateLimited.mockResolvedValue(false);
  mocks.visitoringOrganizations.mockReturnValue([
    {
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme",
    },
  ]);
});

describe("sign-in actions", () => {
  it("starts Perminister SSO without requiring an organization ID", async () => {
    await expect(startPerministerLoginAction()).rejects.toThrow("redirect:/auth/perminister/start");
    expect(mocks.makeVisitoringLastOrganizationCookieAvailable).toHaveBeenCalledOnce();
  });

  it("signs in by email and routes to the organization chooser", async () => {
    mocks.loginWithPerminister.mockResolvedValue({ sessionToken: "session-token" });

    await expect(loginAction(loginForm())).rejects.toThrow("redirect:/organizations");

    expect(mocks.isLoginRateLimited).toHaveBeenCalledWith({
      email: "person@example.com",
      ip: "203.0.113.5",
    });
    expect(mocks.loginWithPerminister).toHaveBeenCalledWith("person@example.com", "secret");
    expect(mocks.clearLoginAccountAttempts).toHaveBeenCalledWith({ email: "person@example.com" });
    expect(mocks.makeVisitoringLastOrganizationCookieAvailable).toHaveBeenCalledOnce();
    expect(mocks.clearVisitoringOrganizationSelection).toHaveBeenCalledOnce();
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("session-token");
  });

  it("revokes a new session when the account has no Visitoring organization", async () => {
    mocks.loginWithPerminister.mockResolvedValue({ sessionToken: "session-token" });
    mocks.visitoringOrganizations.mockReturnValue([]);

    await expect(loginAction(loginForm())).rejects.toThrow("redirect:/login?error=invalid");

    expect(mocks.revokePerministerSession).toHaveBeenCalledWith("session-token");
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
    expect(mocks.clearVisitoringOrganizationSelection).not.toHaveBeenCalled();
  });

  it("does not call Perminister when rate limited", async () => {
    mocks.isLoginRateLimited.mockResolvedValue(true);

    await expect(loginAction(loginForm())).rejects.toThrow("redirect:/login?error=invalid");
    expect(mocks.loginWithPerminister).not.toHaveBeenCalled();
  });
});
