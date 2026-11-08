"use server";

import { redirect } from "next/navigation";
import { selectVisitoringProject } from "@/lib/auth";

export async function selectProjectAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) redirect("/projects?error=access");
  await selectVisitoringProject(projectId);
  redirect("/dashboard");
}
