import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getAnalyticsData } from "@/lib/analytics";
import { Topbar } from "@/app/components/Topbar";
import { Dashboard } from "./view";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function value(input: string | string[] | undefined): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function safeDate(input: string | undefined, fallback: Date): Date {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return fallback;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input
    ? fallback
    : date;
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const defaultFrom = new Date();
  defaultFrom.setUTCHours(0, 0, 0, 0);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const workspaceSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.workspaceId, user.workspaceId))
    .orderBy(desc(sites.createdAt));
  const selectedSite =
    workspaceSites.find((site) => site.id === value(params.site)) ?? workspaceSites[0];
  return (
    <>
      <Topbar user={user} section="dashboard" />
      {selectedSite ? (
        <Dashboard
          sites={workspaceSites}
          siteId={selectedSite.id}
          data={
            await getAnalyticsData({
              workspaceId: user.workspaceId,
              siteId: selectedSite.id,
              from: safeDate(value(params.from), defaultFrom).toISOString(),
              to: new Date(
                safeDate(value(params.to), new Date()).setUTCHours(23, 59, 59, 999),
              ).toISOString(),
              event: value(params.event),
              path: value(params.path),
              property: value(params.property),
              propertyValue: value(params.propertyValue),
              visitor: value(params.visitor),
              session: value(params.session),
            })
          }
          filters={{
            from: value(params.from) ?? defaultFrom.toISOString().slice(0, 10),
            to: value(params.to) ?? new Date().toISOString().slice(0, 10),
            event: value(params.event) ?? "",
            path: value(params.path) ?? "",
            property: value(params.property) ?? "",
            propertyValue: value(params.propertyValue) ?? "",
            visitor: value(params.visitor) ?? "",
            session: value(params.session) ?? "",
          }}
        />
      ) : (
        <main className="emptyState">
          <div className="eyebrow">Set up your first site</div>
          <h1>Analytics start with a site.</h1>
          <p>Add a site and its tracking snippet to start seeing page views and events.</p>
          {user.role === "admin" ? (
            <a className="button buttonPrimary" href="/settings/sites">
              Open settings
            </a>
          ) : (
            <p>Ask your project administrator to add a site.</p>
          )}
        </main>
      )}
    </>
  );
}
