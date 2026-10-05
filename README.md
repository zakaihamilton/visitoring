# Visitoring

Visitoring is a small, self-hosted, multi-site analytics app. It collects page views and custom events, then reports visitors, sessions, pages, referrers, event properties, device categories, browser/OS families, and country/region. Accounts are provisioned by an operator; there is no public signup.

Visitoring is being built as the future analytics destination for Sentry8. Its collector understands Sentry8's current `welcome_*` event names and payloads. Sentry8 remains unchanged until Visitoring is running and accepted.

## How records are stored

PostgreSQL is the source of truth. Each event is a row in `site_events`, linked to a workspace and site. Rows retain the anonymous visitor ID, session ID, event name, query-free path, referrer hostname, JSON properties, coarse device/browser/OS categories, country and first-level region, and the event timestamp. Imported records also get a stable `source_id` such as `sentry8:<source-event-id>` so rerunning an import cannot duplicate them.

Raw IP addresses are looked up transiently for GeoIP and converted to an HMAC hash for a short-lived rate-limit bucket. Full user-agent strings are parsed in memory with Bowser. Neither value is stored. Referrers are reduced to hostnames, and path query strings/fragments are removed before insertion. No browser cookie is used; anonymous visitor and session identifiers are held in localStorage/sessionStorage.

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

Open [http://localhost:3000](http://localhost:3000). The collector accepts local development requests when a site's allowlist includes `localhost:3000`.

The required local variable is `DATABASE_URL`. Set `AUTH_SECRET` and `RATE_LIMIT_SECRET` to distinct, long random values for deployed environments. Production deployments must set `TRUST_PROXY_HEADERS=true` and expose the app only through a trusted reverse proxy that overwrites `x-real-ip` or `x-forwarded-for` with a single client IP. Without that setting, Visitoring ignores forwarded headers and the ready endpoint returns 503. Vercel deployments also need `CRON_SECRET` for the protected daily retention job. `GEOIP_DB_PATH` is optional. `SENTRY8_DATABASE_URL` is required only for history import. Do not commit `.env` or a GeoIP database.

## Provision a workspace, admin, user, and site

Create the first workspace and administrator after running `db:migrate`:

```sh
npm run accounts:provision -- --workspace "Acme" --slug acme --email admin@example.com --password 'a-long-initial-password'
```

Additional workspace accounts are provisioned as admins or viewers:

```sh
npm run users:provision -- --workspace-id WORKSPACE_UUID --email analyst@example.com --password 'a-long-password' --role viewer
```

Sign in with the workspace slug, email, and password. Login attempts are rate-limited by account and, when a trusted client IP is available, by IP. Admins can create sites and manage domains and keys in **Sites**. A site key is shown only after creation or rotation; copy it then. Add domains as hostnames separated by commas, for example `example.com, docs.example.com`. Only exact hosts are accepted, with ports included for local development.

## Install the browser tracker

Add this script tag to each page, replacing the host with your Visitoring address and the key with the site's one-time key:

```html
<script defer src="https://analytics.example.com/tracker.js" data-site-key="vk_…"></script>
```

The tracker automatically records `page_view` on load, `history.pushState`, and browser back/forward navigation. Query strings are not sent. It provides:

```js
window.Visitoring.track("signup", { plan: "starter" });
```

The tracker retains Sentry8's existing localStorage and sessionStorage ID keys so a cutover can preserve browser identifiers. It respects Do Not Track, uses `sendBeacon` with a non-blocking fetch fallback, and sends events to `POST /api/collect`. The collector requires a valid site key and an allowed `Origin`; HTTPS production sites should use HTTPS for Visitoring too.

The collector accepts generic events with `visitorId`, `sessionId`, `eventName`, `path`, optional `referrerHost` and `properties`. It also accepts Sentry8's existing envelope fields (`event`, `anonymousId`, `sessionId`, `path`, `referrerHost`, `properties`). Pass the Visitoring key in `?key=...` (including on preflight) or the `siteKey`/`site_key` field. The five legacy payloads are validated against Sentry8's current contracts.

## Dashboard

The dashboard is workspace-scoped. It supports date and site filters, event name, path, event property key/value, visitor ID, and session ID. It displays total events, page views, unique visitor IDs, sessions, daily activity, popular pages, referrer hosts, event properties, device/browser/OS groups, and country/region groups. Imported `welcome_view` records remain named `welcome_view` and are included in page-view totals.

## GeoIP attribution

Download DB-IP City Lite in MMDB format and set `GEOIP_DB_PATH` to its path. Keep the file outside this repository. Visitoring reads only the country and first-level region fields; collection continues with those fields blank if the file is absent or unreadable. DB-IP data is updated monthly and requires attribution. The dashboard links to [DB-IP](https://db-ip.com); retain the visible “IP geolocation by DB-IP” credit when changing the UI.

Bowser is used to reduce user-agent strings to `desktop/mobile/tablet/other`, browser family, and OS family. No raw IP address or full user-agent string is retained.

## Import Sentry8 history

1. Create a Visitoring site with the same website origin in its allowed-domain list.
2. Create a PostgreSQL role on Sentry8 that can only `SELECT` from `telemetry_events`; use that role in `SENTRY8_DATABASE_URL`.
3. Set `SENTRY8_DATABASE_URL` in the local environment and run:

   ```sh
   npm run import:sentry8 -- --site-id VISITORING_SITE_UUID
   ```

The importer runs a read-only transaction and selects the existing `telemetry_events` columns. It keeps each event name, properties, visitor/session IDs, path, referrer host, and timestamp. `welcome_view` contributes to Visitoring's page-view metric. Imported device and geography values are unknown. The command reports imported, skipped-old, and duplicate counts; its stable source IDs make reruns idempotent.

## Retention and health

Vercel runs the fixed rolling 24-month retention prune daily at 04:00 UTC through a protected cron route. The `CRON_SECRET` production environment variable protects that endpoint. It also removes expired collection and login rate-limit buckets. To run the same job manually:

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

Keep Sentry8's source untouched until Visitoring is running and accepted. Then configure Sentry8's telemetry client to post its same `welcome_*` envelopes to Visitoring with the new site key, disable Sentry8's automatic welcome page view while Visitoring's tracker emits `page_view`, and update Sentry8's privacy notice to describe the added coarse attribution fields. Confirm production events and dashboard totals, then retire Sentry8's telemetry storage and dashboard. Do not run both automatic page-view collectors at once.
