import { NextResponse } from "next/server";
import { requireVisitoringOrganizations } from "@/lib/auth";
import { setInitialVisitoringOrganization } from "@/lib/organization-cookies";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { organizations } = await requireVisitoringOrganizations();
  await setInitialVisitoringOrganization(organizations);

  const response = NextResponse.redirect(new URL("/projects", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
