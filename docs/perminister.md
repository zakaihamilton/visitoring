# Visitoring authentication with Perminister

Perminister owns Visitoring consumer identities, passwords, sessions, and workspace role grants.
Visitoring PostgreSQL stores workspaces, sites, analytics, collection rate limits, and login rate
limits. Visitoring no longer reads or writes local account credentials or sessions.

## Configure Perminister

1. Configure the `visitoring` product in each approved Perminister organization that will own Visitoring workspaces.
2. Create a production app client for that product. Set the session lifetime to 30 days and leave
   self-registration disabled. Record the client ID and secret.
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

## Create a workspace and its first administrator

Create a Visitoring workspace record:

```sh
npm run workspaces:provision -- --workspace "Acme" --slug acme --organization-id "<organization-uuid>"
```

The command stores the selected organization UUID with the workspace and prints the workspace UUID. In Perminister, grant the initial account the `admin` role for that workspace resource under the same organization’s Visitoring product. Workspace login uses this mapping to select the organization and validate its grant. After the first administrator can sign in,
they can add accounts, change roles, reset passwords, deactivate members, and remove workspace
access from **Settings → Users**. New accounts created there cannot self-register, and an existing
Perminister identity keeps its current password.

Visitoring's login form takes the workspace slug and the member's email. After Perminister confirms
the account session, Visitoring verifies that the account has an active `admin` or `viewer` grant for
the selected workspace before opening the dashboard.

## Data migration and storage

The existing Visitoring account and its workspace grant have been imported into Perminister. The next
database migration drops the legacy Visitoring `users` and `auth_sessions` tables, permanently
removing the local password hash and sessions while retaining workspace records and analytics.

Perminister's Spaces-backed auth store requires exactly one active Node.js writer process per bucket;
its in-process queues do not coordinate independent Vercel Function instances. Production uses the
Railway service as that single writer, while Vercel Functions proxy mutations to Railway. Keep the
Railway service at one replica and do not run another Perminister writer against the same bucket.
Vercel reads may continue directly from Spaces using the read-only key.
