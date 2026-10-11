"use server";

import { redirect } from "next/navigation";
import { selectVisitoringWorkspace } from "@/lib/auth";

export async function selectWorkspaceAction(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  if (!workspaceId) redirect("/projects?error=access");
  await selectVisitoringWorkspace(workspaceId);
  redirect("/dashboard");
}
