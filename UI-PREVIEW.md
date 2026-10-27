# Visitoring UI preview

Install with `pnpm install --frozen-lockfile`, then run `pnpm ui:preview` and open <http://127.0.0.1:3100/ui-preview>. No login, database or environment file is required for the preview. The script binds to loopback and uses a polling watcher; do not expose this development server to a network. The preview route returns 404 outside Next.js development mode.

The gallery uses fixed, synthetic data and real production view components. The banner selects screens and states; URLs can be shared locally. The state labels originate in the dashboard: on other screens, “Traffic” selects populated fixtures, while “New site” and “No matching activity” select empty fixtures (the latter also shows the project access error). The admin populated fixture includes active, archived and pending-cleanup projects.

| Production route | How to inspect | Coverage |
| --- | --- | --- |
| `/` | Open `/` directly or Home in the banner | Actual public landing page. |
| `/developers` | Open `/developers` directly or Developer guide in the banner | Actual public developer guide. |
| `/login` | Open `/login` directly or Sign in in the banner | Actual sign-in page; its sign-in form is real and leaves the preview sandbox. |
| `/dashboard` | `?screen=traffic` | Real `Dashboard`; populated, first-event and filtered-empty data. |
| `/dashboard/events` | `?screen=events` | Real `RecentEventsView`; synthetic events or empty table. |
| `/dashboard/chart-data` | `?screen=chart` | Real `ChartDataView`; fixed chart data. |
| `/projects` | `?screen=projects` | Real `ProjectsView`; project card, empty and access-error states. |
| `/organization/admin` | `?screen=project-admin` | Real `ProjectManager`; active, archived and pending-cleanup states, form actions are blocked. |
| `/settings/sites` | `?screen=settings` | Real site form and site list with synthetic key and domains. |
| `/settings/users` | `?screen=settings-users` | Real user form and list with synthetic members. |
| `/settings/setup` | `?screen=settings-setup` | Real tracker instructions and settings navigation. |
| `/settings`, `/sites` | Redirect to `/settings/sites` | Use `?screen=settings`. |
| `/organizations` | Redirect to the organization-auth flow | No standalone screen. |

`/auth/*`, `/api/*`, and `/tracker.js` are auth, API or tracker endpoints, not page views; they are outside the gallery. Public links leave the sandbox and follow normal application behavior. Dashboard, settings and admin previews include the real authenticated top bar with a synthetic user; project selection includes its actual header. Settings pages reproduce their layout around the real components, so changes to page-level wrappers need to be reflected in the preview. Auth, loading/error responses from real services, persistence, and server-side behavior are not simulated.

Within the gallery, application links and form submissions are intercepted, and a `form-action 'none'` response policy blocks native form posts before hydration. The policy is scoped to `/ui-preview` and does not replace server authorization; never use this development server as a security boundary. Dropdowns, charts and tooltips can be inspected, but form-driven confirmation dialogs do not open and forms do not save or navigate. The scenario and public-page links in the banner are outside that guard. Direct public pages use normal production links and actions.

For a UI task, open the relevant screen, inspect desktop and mobile widths, edit the production component/CSS, and reload. Add typed, synthetic fixture states as needed; never put customer data in fixtures. The fixed dates make screenshot comparisons reproducible.
