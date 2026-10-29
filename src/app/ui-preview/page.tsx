import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/app/components/Topbar";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";
import { ChartDataView } from "@/app/dashboard/chart-data/view";
import { TrafficMetricProvider } from "@/app/dashboard/components/TrafficMetric";
import { RecentEventsView } from "@/app/dashboard/events/view";
import { Dashboard } from "@/app/dashboard/view";
import { TrackerSection } from "@/app/developers/components/TrackerSection";
import { ProjectManager } from "@/app/projects/ProjectManager";
import { ProjectsView } from "@/app/projects/ProjectsView";
import projectStyles from "@/app/projects/projects.module.css";
import { SettingsNavigation } from "@/app/settings/SettingsNavigation";
import settingsStyles from "@/app/settings/settings-page.module.css";
import { CreateSiteForm } from "@/app/settings/sites/components/CreateSiteForm";
import { SiteListView } from "@/app/settings/sites/SiteListView";
import { UserList } from "@/app/settings/users/components/UserList";
import { UsersManager } from "@/app/settings/users/UsersManager";
import { type Scenario, scenarios, sites } from "./fixtures";
import { PreviewGuard } from "./PreviewGuard";
import { PreviewDropdown, PreviewToolbar } from "@zakaihamilton/ui-preview-kit";

const previewScreens = [
  "traffic",
  "events",
  "chart",
  "settings",
  "settings-users",
  "settings-setup",
  "projects",
  "project-admin",
] as const;

export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; screen?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { scenario, screen: requestedScreen } = await searchParams;
  const screen = previewScreens.find((item) => item === requestedScreen) ?? "traffic";
  const selected: Scenario =
    scenario && Object.hasOwn(scenarios, scenario) ? (scenario as Scenario) : "populated";
  const fixture = scenarios[selected];
  const filters = {
    from: "2026-10-01",
    to: "2026-10-07",
    event: fixture.event,
    path: "",
    property: "",
    propertyValue: "",
    visitor: "",
    session: "",
  };
  const organizations = [{ organizationId: "preview-org", organizationName: "Example Studio" }];
  const previewUser: CurrentUser = {
    id: "preview-user",
    workspaceId: "preview",
    workspaceName: "Example project",
    organizationId: "preview-org",
    organizationName: "Example Studio",
    email: "alex@example.test",
    role: "admin",
    organizations,
    canManageOrganization: true,
  };
  const previewAdmin: OrganizationAdmin = {
    actorId: "preview-user",
    organizationId: "preview-org",
    organizationName: "Example Studio",
    email: "alex@example.test",
    organizations,
  };
  const eventData = {
    total: selected === "populated" ? 2 : 0,
    page: 1,
    pages: 1,
    pageSize: 20,
    snapshotAt: "2026-10-07T23:59:59.999Z",
    retrievedAt: fixture.data.retrievedAt,
    eventNames: fixture.data.eventNames,
    events:
      selected === "populated"
        ? [
            {
              id: 1,
              eventName: "page_view",
              path: "/pricing",
              visitorId: "visitor-example-123456",
              sessionId: "session-1",
              properties: { source: "search" },
              createdAt: "2026-10-07T10:00:00.000Z",
            },
            {
              id: 2,
              eventName: "signup",
              path: "/register",
              visitorId: "visitor-example-987654",
              sessionId: "session-2",
              properties: { plan: "starter" },
              createdAt: "2026-10-06T09:00:00.000Z",
            },
          ]
        : [],
  };
  return (
    <>
      <PreviewToolbar
        subtitle="Synthetic data · local preview"
        note="Application links and form submissions are disabled. Local controls remain interactive."
        utilitiesLabel="Public pages"
        utilities={
          <>
            <span>Open</span>
            <Link href="/">Home</Link>
            <Link href="/developers">Developer guide</Link>
            <Link href="/login">Sign in</Link>
          </>
        }
      >
        <PreviewDropdown
          label="Screen"
          value={screen}
          options={previewScreens.map((item) => ({
            value: item,
            label: item.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
            href: "/ui-preview?screen=" + encodeURIComponent(item) + "&scenario=" + selected,
          }))}
        />
        <PreviewDropdown
          label="Scenario"
          value={selected}
          options={Object.entries(scenarios).map(([key, item]) => ({
            value: key,
            label: item.label,
            href: "/ui-preview?screen=" + encodeURIComponent(screen) + "&scenario=" + key,
          }))}
        />
      </PreviewToolbar>
      <PreviewGuard>
        {screen !== "projects" && (
          <Topbar
            user={screen === "project-admin" ? previewAdmin : previewUser}
            section={
              screen === "project-admin"
                ? "organization-admin"
                : screen?.startsWith("settings")
                  ? "settings"
                  : "dashboard"
            }
          />
        )}
        <TrafficMetricProvider key={selected}>
          {screen === "settings" && (
            <>
              <SettingsNavigation active="sites" />
              <main className={settingsStyles.page}>
                <div className={settingsStyles.intro}>
                  <div>
                    <div className={settingsStyles.eyebrow}>Settings · Sites</div>
                    <h1>Manage your sites</h1>
                    <p>
                      Add each website you track. Approved addresses and tracking keys are managed
                      here.
                    </p>
                  </div>
                </div>
                <section className={settingsStyles.card}>
                  <div className={settingsStyles.cardHeading}>
                    <h2>Add a site</h2>
                    <span className={settingsStyles.hint}>A site can be a website or web app.</span>
                  </div>
                  <CreateSiteForm />
                </section>
                <SiteListView
                  workspaceSites={
                    selected === "populated"
                      ? [
                          {
                            id: "preview",
                            name: "Example site",
                            allowedDomains: ["example.test", "www.example.test"],
                            siteKey: "preview-key",
                            siteKeyPrefix: "preview",
                          },
                        ]
                      : []
                  }
                />
              </main>
            </>
          )}
          {screen === "settings-users" && (
            <>
              <SettingsNavigation active="users" />
              <main className={settingsStyles.page}>
                <div className={settingsStyles.intro}>
                  <div>
                    <div className={settingsStyles.eyebrow}>Settings · Users</div>
                    <h1>Manage users</h1>
                    <p>Add people to your project and control their access to its dashboard.</p>
                  </div>
                </div>
                <UsersManager />
                <UserList
                  currentUserId="preview-admin"
                  users={
                    selected === "populated"
                      ? [
                          {
                            id: "preview-admin",
                            email: "alex@example.test",
                            role: "admin",
                            isActive: true,
                          },
                          {
                            id: "preview-viewer",
                            email: "sam@example.test",
                            role: "viewer",
                            isActive: true,
                          },
                        ]
                      : []
                  }
                />
              </main>
            </>
          )}
          {screen === "settings-setup" && (
            <>
              <SettingsNavigation active="setup" />
              <main className={settingsStyles.page}>
                <div className={settingsStyles.intro}>
                  <div>
                    <div className={settingsStyles.eyebrow}>Settings · Setup</div>
                    <h1>Connect your website</h1>
                    <p>Choose the integration that matches your website.</p>
                  </div>
                </div>
                <TrackerSection numbered={false} />
              </main>
            </>
          )}
          {screen === "projects" && (
            <ProjectsView
              error={selected === "filtered" ? "access" : undefined}
              workspacesData={{
                organizationId: "preview-org",
                organizationName: "Example Studio",
                organizations: [
                  {
                    organizationId: "preview-org",
                    organizationName: "Example Studio",
                  },
                ],
                canManageProjects: true,
                workspaces:
                  selected === "populated"
                    ? [
                        {
                          id: "preview",
                          name: "Example project",
                          organizationId: "preview-org",
                          organizationName: "Example Studio",
                          role: "admin",
                        },
                      ]
                    : [],
              }}
            />
          )}
          {screen === "project-admin" && (
            <main className={projectStyles.adminPage}>
              <ProjectManager
                projects={
                  selected === "populated"
                    ? [
                        {
                          id: "preview",
                          name: "Example project",
                          archivedAt: null,
                          deletionPendingAt: null,
                        },
                        {
                          id: "preview-archived",
                          name: "Archived example",
                          archivedAt: "2026-09-01T00:00:00.000Z",
                          deletionPendingAt: null,
                        },
                        {
                          id: "preview-pending",
                          name: "Pending cleanup example",
                          archivedAt: "2026-09-01T00:00:00.000Z",
                          deletionPendingAt: "2026-09-02T00:00:00.000Z",
                        },
                      ]
                    : []
                }
              />
            </main>
          )}
          {screen === "traffic" && (
            <Dashboard sites={sites} siteId="demo-site" data={fixture.data} filters={filters} />
          )}
          {screen === "chart" && (
            <ChartDataView sites={sites} siteId="demo-site" data={fixture.data} filters={filters} />
          )}
          {screen === "events" && (
            <RecentEventsView sites={sites} siteId="demo-site" data={eventData} filters={filters} />
          )}
        </TrafficMetricProvider>
      </PreviewGuard>
    </>
  );
}
