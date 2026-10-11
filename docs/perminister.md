# Visitoring authentication with Perminister

Perminister owns Visitoring consumer identities, passwords, sessions, and workspace role grants.
Visitoring PostgreSQL stores workspaces, sites, analytics, collection rate limits, and login rate
limits. Visitoring no longer reads or writes local account credentials or sessions.

## Configure Perminister

1. Configure the `visitoring` product in each approved Perminister organization that will own Visitoring workspaces.
2. Create a production app client for that product. Set the exact Visitoring origin as its app
   origin, set the session lifetime to 30 days, and leave self-registration disabled. Record the
   client ID and secret. The SSO callback is `/auth/perminister/callback` on that origin.
3. Create a separate app client for local development, preferably in a staging organization with
   separate workspace data.
4. Set the following server-only environment variables for each Visitoring deployment:

   ```dotenv
   PERMINISTER_BASE_URL=https://www.perminister.com
   PERMINISTER_APP_CLIENT_ID=<client id>
   PERMINISTER_APP_CLIENT_SECRET=<client secret>
   PERMINISTER_PRODUCT_ID=visitoring
   ```

Never expose the app client secret to browser code. All sign-in, session checks, and membership
operations go through Perminister; there is no local authentication fallback.

## Manage Visitoring projects

Deploy the Perminister release with the Visitoring workspace lifecycle endpoints before deploying a
Visitoring release that calls them. Then run Visitoring's `db:migrate`; the new nullable archive and
deletion-pending fields leave existing workspaces active.

Organization owners and admins can add projects from Visitoring's project picker, even when they do
not have a project selected. Visitoring creates the workspace under the selected organization, and
Perminister grants its creator the workspace `admin` role. Organization members can open only
projects for which they have a workspace grant. Workspace members and roles continue to be managed
from **Settings → Users**. New accounts created there cannot self-register, and an existing
Perminister identity keeps its current password.

Archiving a project pauses Visitoring dashboard access and event collection while retaining its
sites, keys, and analytics. Restoring it resumes access and collection. Permanent deletion is
available only for archived projects. Visitoring revokes every Perminister grant for the workspace,
then deletes the local workspace and its cascading site, key, event, and rate-limit data. If either
cleanup step fails, the project remains archived and deletion can be retried; it cannot be restored
while deletion is pending.

For manual or scripted setup, create a Visitoring workspace record with:

```sh
npm run workspaces:provision -- --workspace "ShiftingFront" --organization-id "<organization-uuid>"
```

The command associates the named project with the selected organization and prints its workspace
UUID. In Perminister, grant the initial account the `admin` role for that workspace resource under
the same organization’s Visitoring product.

Visitoring's login form takes the Perminister organization ID and the member's email. After
Perminister confirms the account session, Visitoring shows the account's accessible workspaces for
that organization. The member chooses a workspace to open its dashboard. **Sign in with Perminister**
uses the same organization ID and completes a short-lived, PKCE-protected authorization-code flow
before showing the workspace picker.

## Attribute analytics to a project

Create a site under the project in **Settings → Sites**. Visitoring issues a tracking key for that
site. The collector looks up the site by the key, checks the request's domain against the site's
allowed domains, and saves the event with both the site ID and its owning workspace ID. The browser
does not need to send a separate Perminister product or organization ID with each event. If
ShiftingFront and Puzzimori both use Visitoring, create their sites under their respective project
workspaces so their keys and analytics remain separate.

## Data migration and storage

The existing Visitoring account and its workspace grant have been imported into Perminister. The next
database migration drops the legacy Visitoring `users` and `auth_sessions` tables, permanently
removing the local password hash and sessions while retaining workspace records and analytics.

Perminister's Spaces-backed auth store requires exactly one active Node.js writer process per bucket;
its in-process queues do not coordinate independent Vercel Function instances. Production uses the
Railway service as that single writer, while Vercel Functions proxy mutations to Railway. Keep the
Railway service at one replica and do not run another Perminister writer against the same bucket.
Vercel reads may continue directly from Spaces using the read-only key.
