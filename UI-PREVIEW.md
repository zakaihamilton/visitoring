# Visitoring UI preview

Install with `pnpm install --frozen-lockfile`, then run `pnpm ui:preview` and open <http://127.0.0.1:3100/ui-preview>. No login, database or environment file is required for the preview. The script binds to loopback and uses a polling watcher; do not expose this development server to a network. The preview route returns 404 outside Next.js development mode.

The gallery uses fixed, synthetic data and real production view components. The banner selects screens and states; URLs can be shared locally. Each analytics state carries through to traffic, chart, and event views. “New site” shows the onboarding state, “No matching activity” applies an event filter, and “Project access error” displays the access-denied project state. The admin populated fixture includes active, archived and pending-cleanup projects.

| Scenario | Coverage |
| --- | --- |
| Traffic / new site / no matching activity | Populated analytics, first-event onboarding, and filtered-empty results |
| High traffic / long project and URL names | Dense tables, event pagination, charts, and wrapping in project/site/path labels |
| No activity in date range | A fixed future date range with zero traffic and chart buckets |
| Tracking blocked / delayed ingestion / ingestion error | Site status feedback, stale-data timing, and recoverable ingestion failure |
| Project access error | Project list permission error |

| Production route | How to inspect | Coverage |
| --- | --- | --- |
| `/` | Open `/` directly or Home in the banner | Actual public landing page. |
| `/developers` | Open `/developers` directly or Developer guide in the banner | Actual public developer guide. |
| `/login` | Open `/login` directly or Sign in in the banner | Actual sign-in page; its sign-in form is real and leaves the preview sandbox. |
| `/dashboard` | `?screen=traffic` | Real `Dashboard`; populated, first-event and filtered-empty data. |
| `/dashboard/events` | `?screen=events` | Real `RecentEventsView`; synthetic events or empty table. |
| `/dashboard/chart-data` | `?screen=chart` | Real `ChartDataView`; fixed chart data. |
| `/projects` | `?screen=projects` | Real `ProjectsView`; project card, empty and access-error states. |
| `/organization/admin` | `?screen=project-admin` or `?screen=project-created` | Real `ProjectManager`; active, archived and pending-cleanup states, plus the post-create open-project button. Form actions are blocked. |
| `/settings/sites` | `?screen=settings` | Real site form and site list with synthetic key and domains. |
| `/settings/users` | `?screen=settings-users` | Real user form and list with synthetic members. |
| `/settings/setup` | `?screen=settings-setup` | Real tracker instructions and settings navigation. |
| `/settings`, `/sites` | Redirect to `/settings/sites` | Use `?screen=settings`. |
| `/organizations` | Redirect to the organization-auth flow | No standalone screen. |

`/auth/*`, `/api/*`, and `/tracker.js` are auth, API or tracker endpoints, not page views; they are outside the gallery. Public links leave the sandbox and follow normal application behavior. Dashboard, settings and admin previews include the real authenticated top bar with a synthetic user; project selection includes its actual header. Settings pages reproduce their layout around the real components, so changes to page-level wrappers need to be reflected in the preview. Auth, loading/error responses from real services, persistence, and server-side behavior are not simulated.

Within the gallery, application links and form submissions are intercepted, and a `form-action 'none'` response policy blocks native form posts before hydration. The policy is scoped to `/ui-preview` and does not replace server authorization; never use this development server as a security boundary. Dropdowns, charts and tooltips can be inspected. The site deletion confirmation can be opened, but confirming it is blocked; other form-driven confirmation dialogs do not open, and forms do not save or navigate. The scenario and public-page links in the banner are outside that guard. Direct public pages use normal production links and actions.

For a UI task, open the relevant screen, inspect desktop and mobile widths, edit the production component/CSS, and reload. Add typed, synthetic fixture states as needed; never put customer data in fixtures. The fixed dates make screenshot comparisons reproducible.
