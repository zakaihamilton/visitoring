"use server";

import { redirect } from "next/navigation";
import { requirePerministerSession } from "@/lib/auth";
import { setVisitoringOrganizationCookies } from "@/lib/organization-cookies";
import { visitoringOrganizationForId } from "@/lib/perminister";

const ORGANIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function selectOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "")
    .trim()
    .toLowerCase();
  if (!ORGANIZATION_ID_PATTERN.test(organizationId)) redirect("/organizations?error=invalid");

  const session = await requirePerministerSession();
  const organization = visitoringOrganizationForId(session, organizationId);
  if (!organization) redirect("/organizations?error=invalid");

  await setVisitoringOrganizationCookies(organization.organizationId);
  redirect("/projects");
}
