# Visitoring

Visitoring is lightweight analytics for the websites you run. It collects page views and custom events, then shows visitors, sessions, popular pages, traffic sources, event details, device and browser types, and country or region. An administrator creates accounts; there is no public sign-up.

## How records are stored

Visitoring saves each page view and event in PostgreSQL and associates it with a project and site. A record includes an anonymous visitor code, session code, event name, page path without query details, referring website name, extra event details, general device and browser types, country or region, and the time it happened.

Visitoring never saves raw IP addresses. It checks an IP briefly for approximate location and may use a temporary one-way code to limit repeated requests. Browser details are reduced to broad categories before saving. Visitoring records only the referring website name and page path, not full addresses or query details. It does not use cookies; anonymous visitor and session codes are kept in the browser.

Records older than the rolling 24-month window are pruned daily.

## Run locally

Requirements: Node.js 22+, npm, and Docker Compose (or a local PostgreSQL 15+ database).

```sh
cp .env.example .env
docker compose up -d db
npm ci
npm run db:migrate
npm run dev
```

Use `npm run db:migrate` to apply migrations locally. It serializes migrations and supports the
explicitly marked concurrent-index migrations used for production-safe index builds.

The Compose database listens on host port `5433` to avoid colliding with a local PostgreSQL server. If using your existing local PostgreSQL instead, set `DATABASE_URL` to that server (commonly port `5432`) and skip `docker compose up -d db`.

Open [http://localhost:3000](http://localhost:3000). For local testing, add `localhost:3000` to the site's website addresses.

The required local variables are `DATABASE_URL` and the Perminister app client settings in `.env`. Deployed environments must set `RATE_LIMIT_SECRET` to a random value containing at least 32 UTF-8 bytes; production readiness fails if it is missing or too short. `COLLECTOR_RATE_LIMIT_MAX_EVENTS` optionally changes the per-site/IP cap for each 15-minute window; it defaults to `120` and must be a positive integer. Production deployments must set `TRUST_PROXY_HEADERS=true` and expose the app only through a trusted reverse proxy that overwrites `x-real-ip` or `x-forwarded-for` with a single client IP. Without that setting, Visitoring ignores forwarded headers and the ready endpoint returns 503. Vercel deployments also need `CRON_SECRET` for the protected daily retention job. `GEOIP_DB_PATH` is optional. Do not commit `.env` or a GeoIP database.

Visitoring uses Perminister for identities, passwords, sessions, and workspace access in every environment. Configure a Visitoring product app client for production and a separate client for local development. The setup and workspace bootstrap steps are in [the Perminister guide](docs/perminister.md).

## Manage projects, add accounts, and set up a site

Organization owners and admins can add projects from the project picker, including when they do not
currently have a project selected. The creator receives admin access to the new workspace. Project
members and roles are managed from **Settings → Users**. Other organization members can open projects
they have been granted access to.

Archiving a project pauses tracking and dashboard access while retaining its analytics and keys.
Restore it to resume collection and access. Permanent deletion is available only after archiving;
it removes the project’s Visitoring sites, tracking keys, analytics, and Perminister workspace grants.

For a manual or scripted workspace bootstrap, run `db:migrate` and then:

```sh
npm run workspaces:provision -- --workspace "ShiftingFront" --organization-id "<organization-uuid>"
```

The command associates the named project with a Perminister organization and prints its workspace
UUID. Grant an initial administrator the `admin` role for that Visitoring workspace in Perminister.
To limit password guessing, repeated sign-in attempts are temporarily restricted. Administrators can
open **Settings → Sites** to add websites and manage their tracking keys, and **Settings → Setup** for
tracker instructions. A tracking key appears only when it is created or replaced, so copy it then.
Add every website address that will use the tracker, separated by commas, such as
`example.com, www.example.com`. Each address must match exactly; include a port for local
development, such as `localhost:3000`.

Each Visitoring site gets a tracking key and belongs to one project. The collector uses that key to look up the site, checks that the request comes from an approved domain, then records the event with the site's and project's IDs. This origin check constrains browser requests; it is not authentication against non-browser clients, which can send a spoofed `Origin` header. Tracking keys are public in the browser snippet. For example, ShiftingFront and Puzzimori can each have a site under the same organization; their separate keys keep their analytics attributed to the right project.

## Add Visitoring to a website

For the visual quick start, visit the public [Developers guide](https://visitoring.vercel.app/developers).

Add this script to each page, replacing the host with your Visitoring address and the key with the site's tracking key:

```html
<script defer src="https://analytics.example.com/tracker.js" data-site-key="vk_…"></script>
```

The tracker records a page view when a page opens or when a web app changes pages without reloading, including back and forward navigation. It leaves out query strings and page fragments. To track an action such as a signup, call the event API from the success handler after that action completes:

```js
function onSignupSuccess() {
  window.Visitoring.track("signup", { plan: "starter" });
}
```

The tracker script uses `defer`, so call the API after it has loaded; do not call it while the browser is still parsing the page.

The tracker respects Do Not Track and sends data without blocking the page. It keeps anonymous visitor and session codes in the browser, lists the website that brought someone by name rather than full address, and sends events to `POST /api/collect`. The site must have a tracking key and an approved website address. Use HTTPS for Visitoring when your site uses HTTPS.

The collector accepts events with `visitorId`, `sessionId`, `eventName`, `path`, optional `referrerHost` and `properties`. Pass the Visitoring key in `?key=...` (including on preflight) or the `siteKey` field.

## Dashboard

The dashboard shows activity for the selected project and site. Filter by date, event, page, event details, visitor, or session. See page views, visitors, sessions, daily activity, popular pages, traffic sources, event details, device and browser types, and country or region.

## GeoIP attribution

Download DB-IP City Lite in MMDB format and set `GEOIP_DB_PATH` to its path. Keep the file outside this repository. Visitoring reads only the country and first-level region fields; collection continues with those fields blank if the file is absent or unreadable. DB-IP data is updated monthly and requires attribution. The dashboard links to [DB-IP](https://db-ip.com); retain the visible “IP geolocation by DB-IP” credit when changing the UI.

Bowser is used to reduce user-agent strings to `desktop/mobile/tablet/other`, browser family, and OS family. No raw IP address or full user-agent string is retained.

## Retention and health

Vercel runs the fixed rolling 24-month retention prune daily at 04:00 UTC through a protected cron route. Expired events are deleted in restart-safe batches of 10,000; the job also removes stale collection and login rate-limit buckets. The `CRON_SECRET` production environment variable protects that endpoint. To run the same job manually:

```sh
npm run retention:prune
```

`GET /api/health/live` returns process liveness. `GET /api/health/ready` returns success only while PostgreSQL is reachable and production proxy, rate-limit secret, and collector cap configuration are valid.

Repnix is configured as the repository health gate, with required type, lint, format, test, dead-code, and duplication checks. Greenfield adoption intentionally has no baseline:

```sh
npm run health
```

CI starts PostgreSQL, applies the checked-in database migrations, and runs the same health command. Its integration suite checks collection, rejected origins, rate limiting, Do Not Track, privacy sanitization, retention batching, and workspace isolation.
