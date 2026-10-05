# Visitoring

Visitoring is lightweight analytics for the websites you run. It collects page views and custom events, then shows visitors, sessions, popular pages, traffic sources, event details, device and browser types, and country or region. An administrator creates accounts; there is no public sign-up.

Visitoring is being built as the future analytics destination for Sentry8. Its collector understands Sentry8's current `welcome_*` event names and payloads. Sentry8 remains unchanged until Visitoring is running and accepted.

## How records are stored

Visitoring saves each page view and event in PostgreSQL and associates it with a project and site. A record includes an anonymous visitor code, session code, event name, page path without query details, referring website name, extra event details, general device and browser types, country or region, and the time it happened. Records imported from Sentry8 include a source reference such as `sentry8:<source-event-id>` to prevent duplicates.

Visitoring never saves raw IP addresses. It checks an IP briefly for approximate location and may use a temporary one-way code to limit repeated requests. Browser details are reduced to broad categories before saving. Visitoring records only the referring website name and page path, not full addresses or query details. It does not use cookies; anonymous visitor and session codes are kept in the browser.

Records older than the rolling 24-month window should be pruned daily. The import command skips source rows outside that same window. The source Sentry8 database is queried read-only and is never changed.

## Run locally

Requirements: Node.js 22+, npm, and Docker Compose (or a local PostgreSQL 15+ database).

```sh
cp .env.example .env
docker compose up -d db
npm ci
npm run db:migrate
npm run dev
```

The Compose database listens on host port `5433` to avoid colliding with a local PostgreSQL server. If using your existing local PostgreSQL instead, set `DATABASE_URL` to that server (commonly port `5432`) and skip `docker compose up -d db`.

Open [http://localhost:3000](http://localhost:3000). For local testing, add `localhost:3000` to the site's website addresses.

The required local variable is `DATABASE_URL`. Set `AUTH_SECRET` and `RATE_LIMIT_SECRET` to distinct, long random values for deployed environments. Production deployments must set `TRUST_PROXY_HEADERS=true` and expose the app only through a trusted reverse proxy that overwrites `x-real-ip` or `x-forwarded-for` with a single client IP. Without that setting, Visitoring ignores forwarded headers and the ready endpoint returns 503. Vercel deployments also need `CRON_SECRET` for the protected daily retention job. `GEOIP_DB_PATH` is optional. `SENTRY8_DATABASE_URL` is required only for history import. Do not commit `.env` or a GeoIP database.

## Create a project, add accounts, and set up a site

Create the first project and administrator after running `db:migrate`:

```sh
npm run accounts:provision -- --workspace "Acme" --slug acme --email admin@example.com --password 'a-long-initial-password'
```

Add another account as an administrator or viewer:

```sh
npm run users:provision -- --workspace-id WORKSPACE_UUID --email analyst@example.com --password 'a-long-password' --role viewer
```

Sign in with the short project name entered with `--slug`, your email, and password. For example, a project created with `--slug acme` uses `acme` in the **Project** field. To limit password guessing, repeated sign-in attempts are temporarily restricted. Administrators can open **Settings → Sites** to add websites and manage their tracking keys, and **Settings → Setup** for tracker instructions. A tracking key appears only when it is created or replaced, so copy it then. Add every website address that will use the tracker, separated by commas, such as `example.com, www.example.com`. Each address must match exactly; include a port for local development, such as `localhost:3000`.

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

The collector accepts generic events with `visitorId`, `sessionId`, `eventName`, `path`, optional `referrerHost` and `properties`. It also accepts Sentry8's existing envelope fields (`event`, `anonymousId`, `sessionId`, `path`, `referrerHost`, `properties`). Pass the Visitoring key in `?key=...` (including on preflight) or the `siteKey`/`site_key` field. The five legacy payloads are validated against Sentry8's current contracts.

## Dashboard

The dashboard shows activity for the selected project and site. Filter by date, event, page, event details, visitor, or session. See page views, visitors, sessions, daily activity, popular pages, traffic sources, event details, device and browser types, and country or region. Imported `welcome_view` records keep that event name and count toward page views.

## GeoIP attribution

Download DB-IP City Lite in MMDB format and set `GEOIP_DB_PATH` to its path. Keep the file outside this repository. Visitoring reads only the country and first-level region fields; collection continues with those fields blank if the file is absent or unreadable. DB-IP data is updated monthly and requires attribution. The dashboard links to [DB-IP](https://db-ip.com); retain the visible “IP geolocation by DB-IP” credit when changing the UI.

Bowser is used to reduce user-agent strings to `desktop/mobile/tablet/other`, browser family, and OS family. No raw IP address or full user-agent string is retained.

## Import Sentry8 history

1. Create a Visitoring site with the same website origin in its allowed-domain list.
2. Create a PostgreSQL role on Sentry8 that can only `SELECT` from `telemetry_events`; use that role in `SENTRY8_DATABASE_URL`.
3. Set `SENTRY8_DATABASE_URL` in the local environment. Sentry8 stores `created_at` without a time zone; set `SENTRY8_TIMESTAMP_TIME_ZONE` to the zone those stored timestamps represent (the current Sentry8 database reports GMT, equivalent to UTC). Then run:

   ```sh
   npm run import:sentry8 -- --site-id VISITORING_SITE_UUID
   ```

The importer runs a read-only transaction and selects the existing `telemetry_events` columns. It keeps each event name, properties, visitor/session IDs, path, referrer host, and interprets the source timestamp using `SENTRY8_TIMESTAMP_TIME_ZONE` before storing it in UTC. It imports the rolling 24-month window; older rows are skipped. `welcome_view` contributes to Visitoring's page-view metric. Imported device and geography values are unknown. The command reports imported, skipped-old, and duplicate counts; its stable source IDs make reruns idempotent for rows previously imported by this command.

## Retention and health

Vercel runs the fixed rolling 24-month retention prune daily at 04:00 UTC through a protected cron route. The `CRON_SECRET` production environment variable protects that endpoint. It also removes expired authentication sessions and stale collection and login rate-limit buckets. To run the same job manually:

```sh
npm run retention:prune
```

`GET /api/health/live` returns process liveness. `GET /api/health/ready` returns success only while PostgreSQL is reachable.

Repnix is configured as the repository health gate, with required type, lint, format, test, dead-code, and duplication checks. Greenfield adoption intentionally has no baseline:

```sh
npm run health
```

CI starts PostgreSQL, applies Drizzle migrations, and runs the same health command. Its integration suite checks collection, rejected origins, rate limiting, Do Not Track, privacy sanitization, and workspace isolation.

## Planned Sentry8 cutover (after acceptance)

Sentry8 now has an opt-in client integration, enabled at build time with `NEXT_PUBLIC_VISITORING_URL` and `NEXT_PUBLIC_VISITORING_SITE_KEY`. The public welcome page uses Visitoring's tracker for `page_view`; Sentry8 forwards the remaining `welcome_*` interactions. Configure the Sentry8 site origin in Visitoring's allowed-domain list and update the Sentry8 privacy notice before enabling the settings in production.

Backfill history before the client switch, allow old cached clients to drain, disable Sentry8's old collector, and run the importer again for its final tail. The importer's `sentry8:<event-id>` source references make those two imports idempotent. Do not dual-write the same browser events: source references cannot deduplicate Sentry8 rows against events already received live by Visitoring. Confirm production event delivery and dashboard totals before retiring Sentry8's telemetry storage and dashboard.
