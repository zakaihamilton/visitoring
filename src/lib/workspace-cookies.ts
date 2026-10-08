import "server-only";

import { cookies } from "next/headers";

export async function setVisitoringWorkspaceCookies(workspaceSlug: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };

  cookieStore.set("visitoring_last_project", workspaceSlug, {
    ...cookieOptions,
    path: "/login",
  });
  cookieStore.set("visitoring_workspace", workspaceSlug, {
    ...cookieOptions,
    path: "/",
  });
}
