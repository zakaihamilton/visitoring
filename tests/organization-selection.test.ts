import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  requirePerministerSession: vi.fn(),
  visitoringOrganizationForId: vi.fn(),
  setVisitoringOrganizationCookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requirePerministerSession: mocks.requirePerministerSession }));
vi.mock("@/lib/perminister", () => ({
  visitoringOrganizationForId: mocks.visitoringOrganizationForId,
}));
vi.mock("@/lib/organization-cookies", () => ({
  setVisitoringOrganizationCookies: mocks.setVisitoringOrganizationCookies,
}));

import { selectOrganizationAction } from "@/app/organizations/actions";

const organizationId = "11111111-1111-4111-8111-111111111111";

function selectionForm(value: string) {
  const formData = new FormData();
  formData.set("organizationId", value);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePerministerSession.mockResolvedValue({ authenticated: true });
  mocks.visitoringOrganizationForId.mockReturnValue({ organizationId });
});

describe("organization selection action", () => {
  it("sets the validated organization and continues to projects", async () => {
    await expect(selectOrganizationAction(selectionForm(organizationId))).rejects.toThrow(
      "redirect:/projects",
    );

    expect(mocks.visitoringOrganizationForId).toHaveBeenCalledWith(
      { authenticated: true },
      organizationId,
    );
    expect(mocks.setVisitoringOrganizationCookies).toHaveBeenCalledWith(organizationId);
  });

  it("rejects an organization that is absent from the authenticated session", async () => {
    mocks.visitoringOrganizationForId.mockReturnValue(null);

    await expect(selectOrganizationAction(selectionForm(organizationId))).rejects.toThrow(
      "redirect:/organizations?error=invalid",
    );
    expect(mocks.setVisitoringOrganizationCookies).not.toHaveBeenCalled();
  });

  it("rejects a malformed organization ID before looking up the session", async () => {
    await expect(selectOrganizationAction(selectionForm("not-an-id"))).rejects.toThrow(
      "redirect:/organizations?error=invalid",
    );
    expect(mocks.requirePerministerSession).not.toHaveBeenCalled();
  });
});
