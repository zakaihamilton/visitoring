import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviewDropdown, PreviewToolbar } from "ui-preview-kit";
import { VisitoringDashboardFrame } from "@/app/components/VisitoringDashboardFrame";
import { ChartDataView } from "@/app/dashboard/chart-data/view";
import { TrafficMetricProvider } from "@/app/dashboard/components/TrafficMetric";
import { RecentEventsView } from "@/app/dashboard/events/view";
import { Dashboard } from "@/app/dashboard/view";
import { TrackerSection } from "@/app/developers/components/TrackerSection";
import { ProjectManager } from "@/app/projects/ProjectManager";
import { ProjectsView } from "@/app/projects/ProjectsView";
import projectStyles from "@/app/projects/projects.module.css";
import { SettingsPageIntro } from "@/app/settings/SettingsPageIntro";
import settingsStyles from "@/app/settings/settings-page.module.css";
import { CreateSiteForm } from "@/app/settings/sites/components/CreateSiteForm";
import { SiteListView } from "@/app/settings/sites/SiteListView";
import { UserList } from "@/app/settings/users/components/UserList";
import { UsersManager } from "@/app/settings/users/UsersManager";
import type { DashboardData } from "@/app/dashboard/components/types";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";
import { projectCreationSuccess, type Scenario, scenarios, sites } from "./fixtures";
import { PreviewGuard } from "./PreviewGuard";

const previewScreens = [
  "traffic",
  "events",
  "chart",
  "settings",
  "settings-users",
  "settings-setup",
  "projects",
  "project-admin",
  "project-created",
] as const;

type PreviewFixture = {
  label: string;
  data: DashboardData;
  event: string;
  from?: string;
  to?: string;
  projectName?: string;
  siteName?: string;
};

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
  const fixture: PreviewFixture = scenarios[selected];
  const previewSites = [{ ...sites[0], name: fixture.siteName ?? sites[0].name }];
  const hasConfiguredProject = selected !== "onboarding";
  const isTrafficScreen = screen === "traffic" || screen === "events" || screen === "chart";
  const previewStatusMessage =
    selected === "tracking-blocked"
      ? "Tracking requests are being rejected because this site is not on the approved domain list. Review the site’s allowed domains and tracking key."
      : selected === "delayed-ingestion"
        ? "Analytics data is arriving late. The latest complete batch was received on October 4 at 08:30 UTC."
        : selected === "ingestion-error"
          ? "Visitoring could not retrieve the latest analytics batch. The data below is empty until ingestion recovers."
          : null;
  const filters = {
    from: fixture.from ?? "2026-10-01",
    to: fixture.to ?? "2026-10-07",
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
    projectId: "preview",
    projectName: fixture.projectName ?? "Example project",
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
  const hasEvents =
    selected === "populated" ||
    selected === "high-traffic" ||
    selected === "long-names" ||
    selected === "delayed-ingestion";
  const eventCount = selected === "high-traffic" ? 42 : hasEvents ? 2 : 0;
  const eventData = {
    total: eventCount,
    page: 1,
    pages: Math.max(1, Math.ceil(eventCount / 20)),
    pageSize: 20,
    snapshotAt: "2026-10-07T23:59:59.999Z",
    retrievedAt: fixture.data.retrievedAt,
    eventNames: fixture.data.eventNames,
    events: Array.from({ length: Math.min(eventCount, 20) }, (_, index) => ({
      id: index + 1,
      eventName: index % 2 ? "signup" : "page_view",
      path:
        selected === "long-names" && index === 0
          ? "/resources/customer-stories/how-distributed-product-teams-coordinate-regional-launches-and-keep-analytics-consistent"
          : index % 2
            ? "/register"
            : "/pricing",
      visitorId: `visitor-example-${String(index + 1).padStart(6, "0")}`,
      sessionId: `session-${index + 1}`,
      properties: index % 2 ? { plan: "starter" } : { source: "search" },
      createdAt: "2026-10-07T10:00:00.000Z",
    })),
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
            href: `/ui-preview?screen=${encodeURIComponent(item)}&scenario=${selected}`,
          }))}
        />
        <PreviewDropdown
          label="Scenario"
          value={selected}
          options={Object.entries(scenarios).map(([key, item]) => ({
            value: key,
            label: item.label,
            href: `/ui-preview?screen=${encodeURIComponent(screen)}&scenario=${key}`,
          }))}
        />
      </PreviewToolbar>
      <PreviewGuard>
        <VisitoringDashboardFrame
          user={screen.startsWith("project-") ? previewAdmin : previewUser}
          active={
            screen === "traffic"
              ? "overview"
              : screen === "events"
                ? "events"
                : screen === "chart"
                  ? "chart-data"
                  : screen === "projects"
                    ? "projects"
                    : screen === "settings"
                      ? "sites"
                      : screen === "settings-users"
                        ? "users"
                        : screen === "settings-setup"
                          ? "setup"
                          : "organization-admin"
          }
          title={
            screen === "traffic"
              ? "Traffic overview"
              : screen === "events"
                ? "Recent events"
                : screen === "chart"
                  ? "Chart data"
                  : screen === "projects"
                    ? "Your projects"
                    : screen === "settings"
                      ? "Sites and tracking"
                      : screen === "settings-users"
                        ? "Team members"
                        : screen === "settings-setup"
                          ? "Installation guide"
                          : "Organization admin"
          }
        >
        <TrafficMetricProvider key={selected}>
          {isTrafficScreen && previewStatusMessage ? (
            <div className={settingsStyles.notice} role={selected === "ingestion-error" ? "alert" : "status"}>
              <p>{previewStatusMessage}</p>
            </div>
          ) : null}
          {screen === "settings" && (
            <>
              <main className={settingsStyles.page}>
                <SettingsPageIntro
                  eyebrow="Settings · Sites"
                  title="Manage your sites"
                  description="Add each website you track. Approved addresses and tracking keys are managed here."
                />
                <section className={settingsStyles.card}>
                  <div className={settingsStyles.cardHeading}>
                    <h2>Add a site</h2>
                    <span className={settingsStyles.hint}>A site can be a website or web app.</span>
                  </div>
                  <CreateSiteForm />
                </section>
                <SiteListView
                  projectSites={
                    hasConfiguredProject
                      ? [
                          {
                            id: "preview",
                            name: previewSites[0].name,
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
              <main className={settingsStyles.page}>
                <SettingsPageIntro
                  eyebrow="Settings · Users"
                  title="Manage users"
                  description="Add people to your project and control their access to its dashboard."
                />
                <UsersManager />
                <UserList
                  currentUserId="preview-admin"
                  users={
                    hasConfiguredProject
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
              <main className={settingsStyles.page}>
                <SettingsPageIntro
                  eyebrow="Settings · Setup"
                  title="Connect your website"
                  description="Choose the integration that matches your website."
                />
                <TrackerSection numbered={false} />
              </main>
            </>
          )}
          {screen === "projects" && (
            <ProjectsView
              error={selected === "project-access-error" ? "access" : undefined}
              projectsData={{
                organizationId: "preview-org",
                organizationName: "Example Studio",
                organizations: [
                  {
                    organizationId: "preview-org",
                    organizationName: "Example Studio",
                  },
                ],
                canManageProjects: true,
                projects:
                  hasConfiguredProject
                    ? [
                        {
                          id: "preview",
                          name: previewUser.projectName,
                          organizationId: "preview-org",
                          organizationName: "Example Studio",
                          role: "admin",
                        },
                      ]
                    : [],
              }}
            />
          )}
          {(screen === "project-admin" || screen === "project-created") && (
            <main className={projectStyles.adminPage}>
              <ProjectManager
                projects={
                  hasConfiguredProject
                    ? [
                        {
                          id: "preview",
                          name: previewUser.projectName,
                          archivedAt: null,
                          deletionPendingAt: null,
                        },
                        ...(screen === "project-created"
                          ? [
                              {
                                id: "preview-created-project",
                                name: "New example project",
                                archivedAt: null,
                                deletionPendingAt: null,
                              },
                            ]
                          : []),
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
                createInitialState={
                  screen === "project-created" ? projectCreationSuccess : undefined
                }
              />
            </main>
          )}
          {screen === "traffic" && (
            <Dashboard sites={previewSites} siteId="demo-site" data={fixture.data} filters={filters} />
          )}
          {screen === "chart" && (
            <ChartDataView sites={previewSites} siteId="demo-site" data={fixture.data} filters={filters} />
          )}
          {screen === "events" && (
            <RecentEventsView sites={previewSites} siteId="demo-site" data={eventData} filters={filters} />
          )}
        </TrafficMetricProvider>
        </VisitoringDashboardFrame>
      </PreviewGuard>
    </>
  );
}
