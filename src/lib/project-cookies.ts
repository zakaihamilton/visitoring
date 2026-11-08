import "server-only";

import { cookies } from "next/headers";

export async function setVisitoringProjectCookie(projectId: string): Promise<void> {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  } as const;
  jar.set("visitoring_project_id", projectId, options);
  jar.set("visitoring_workspace_id", "", { ...options, maxAge: 0 });
}
