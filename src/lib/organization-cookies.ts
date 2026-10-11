import "server-only";

import { cookies } from "next/headers";

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
    path: "/login",
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
