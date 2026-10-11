import "server-only";

import { cookies } from "next/headers";
import type { VisitoringOrganizationChoice } from "@/lib/perminister";

export async function makeVisitoringLastOrganizationCookieAvailable(): Promise<void> {
  const cookieStore = await cookies();
  const organizationId = cookieStore.get("visitoring_last_organization")?.value;
  if (!organizationId) return;

  cookieStore.set("visitoring_last_organization", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function setVisitoringOrganizationCookies(organizationId: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };

  cookieStore.set("visitoring_last_organization", organizationId, {
    ...cookieOptions,
    path: "/",
  });
  cookieStore.set("visitoring_organization_id", organizationId, {
    ...cookieOptions,
    path: "/",
  });
  cookieStore.set("visitoring_workspace_id", "", {
    ...cookieOptions,
    path: "/",
    maxAge: 0,
  });
}

export async function setInitialVisitoringOrganization(
  organizations: VisitoringOrganizationChoice[],
): Promise<string> {
  if (organizations.length === 0) {
    throw new Error("A Visitoring organization is required to create an organization context.");
  }

  const cookieStore = await cookies();
  const rememberedOrganizationId = cookieStore
    .get("visitoring_last_organization")
    ?.value.toLowerCase();
  const organization =
    organizations.find((item) => item.organizationId === rememberedOrganizationId) ??
    organizations[0];
  if (!organization) {
    throw new Error("A Visitoring organization is required to create an organization context.");
  }

  await setVisitoringOrganizationCookies(organization.organizationId);
  return organization.organizationId;
}

export async function clearVisitoringOrganizationSelection(): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  cookieStore.set("visitoring_organization_id", "", cookieOptions);
  cookieStore.set("visitoring_workspace_id", "", cookieOptions);
}
