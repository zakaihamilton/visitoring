"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createSiteKey, sha256 } from "@/lib/crypto";
import { parseAllowedDomains } from "@/lib/domains";

export type SiteActionState = { message: string; key?: string; error?: boolean };

export async function createSiteAction(
  _state: SiteActionState,
  formData: FormData,
): Promise<SiteActionState> {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120)
    return { message: "Enter a site name up to 120 characters.", error: true };
  let domains: string[];
  try {
    domains = parseAllowedDomains(String(formData.get("domains") ?? ""));
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Invalid domains.", error: true };
  }
  if (domains.length === 0) return { message: "Add at least one allowed domain.", error: true };
  const key = createSiteKey();
  await db.insert(sites).values({
    workspaceId: user.workspaceId,
    name,
    allowedDomains: domains,
    siteKeyHash: sha256(key),
    siteKeyPrefix: key.slice(0, 11),
  });
  revalidatePath("/sites");
  return { message: "Site created. Copy the key now; it is shown only once.", key };
}

export async function updateDomainsAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const siteId = String(formData.get("siteId") ?? "");
  const domains = parseAllowedDomains(String(formData.get("domains") ?? ""));
  if (!siteId || domains.length === 0)
    throw new Error("A site and at least one domain are required.");
  await db
    .update(sites)
    .set({ allowedDomains: domains, updatedAt: new Date() })
    .where(and(eq(sites.id, siteId), eq(sites.workspaceId, user.workspaceId)));
  revalidatePath("/sites");
}

export async function rotateSiteKeyAction(
  _state: SiteActionState,
  formData: FormData,
): Promise<SiteActionState> {
  const user = await requireAdmin();
  const siteId = String(formData.get("siteId") ?? "");
  if (!siteId) return { message: "Choose a site.", error: true };
  const key = createSiteKey();
  const [updated] = await db
    .update(sites)
    .set({
      siteKeyHash: sha256(key),
      siteKeyPrefix: key.slice(0, 11),
      updatedAt: new Date(),
    })
    .where(and(eq(sites.id, siteId), eq(sites.workspaceId, user.workspaceId)))
    .returning({ id: sites.id });
  if (!updated) return { message: "Site was not found in your workspace.", error: true };
  revalidatePath("/sites");
  return { message: "Key rotated. Update your tracker now; the old key no longer works.", key };
}
