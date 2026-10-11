import { beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies }));

import {
  clearVisitoringOrganizationSelection,
  makeVisitoringLastOrganizationCookieAvailable,
  setVisitoringOrganizationCookies,
} from "@/lib/organization-cookies";

const organizationId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  cookies.mockResolvedValue({ set: vi.fn() });
});

describe("organization cookies", () => {
  it("stores the remembered organization across routes and clears workspace context", async () => {
    const cookieStore = await cookies();

    await setVisitoringOrganizationCookies(organizationId);

    expect(cookieStore.set).toHaveBeenCalledWith(
      "visitoring_last_organization",
      organizationId,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "visitoring_organization_id",
      organizationId,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "visitoring_workspace_id",
      "",
      expect.objectContaining({ path: "/", maxAge: 0 }),
    );
  });

  it("clears stale active organization and workspace cookies", async () => {
    const cookieStore = await cookies();

    await clearVisitoringOrganizationSelection();

    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "visitoring_organization_id",
      "",
      expect.objectContaining({ path: "/", maxAge: 0 }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "visitoring_workspace_id",
      "",
      expect.objectContaining({ path: "/", maxAge: 0 }),
    );
  });

  it("promotes a remembered organization cookie so the chooser can read it", async () => {
    const set = vi.fn();
    cookies.mockResolvedValue({
      get: (name: string) =>
        name === "visitoring_last_organization" ? { value: organizationId } : undefined,
      set,
    });

    await makeVisitoringLastOrganizationCookieAvailable();

    expect(set).toHaveBeenCalledWith(
      "visitoring_last_organization",
      organizationId,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });
});
