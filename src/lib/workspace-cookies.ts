import "server-only";

import { cookies } from "next/headers";

export async function setVisitoringWorkspaceCookie(workspaceId: string): Promise<void> {
  (await cookies()).set("visitoring_workspace_id", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
