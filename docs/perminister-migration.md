# Visitoring authentication with Perminister

Visitoring keeps workspace, site, and analytics data in its PostgreSQL database. Perminister owns
consumer identities, passwords, app sessions, and workspace role grants after cutover. Existing
workspace UUIDs are reused as Perminister workspace resource IDs.

## Configure Perminister

1. Create or select an approved Perminister organization and configure its `visitoring` product.
2. Create an app client for that product in Perminister’s App clients page. Set the session lifetime to
   30 days, leave self-registration disabled, and record the client ID and secret. The client ID is
   created and managed dynamically in Perminister; it is not a code constant.
3. Confirm `PERMINISTER_LEGACY_IMPORT_SECRET` is configured on the Perminister deployment with at
   least 32 random characters.
4. Keep the exact organization ID and product ID (`visitoring`) for the import and Visitoring
   configuration.

## Dry-run and import

Run the migration from a trusted operator machine with database read access. The manifest contains
password hashes and is sent directly to Perminister; the script never prints or saves it.

Set `DATABASE_URL`, `PERMINISTER_BASE_URL`, `PERMINISTER_ORGANIZATION_ID`, and
`PERMINISTER_LEGACY_IMPORT_SECRET` in the operator environment, then run:

```sh
npm run auth:perminister:dry-run
```

The command defaults to dry-run. It reports identity and membership totals, validation errors, and
credential conflicts without printing hashes. Visitoring records that share a normalized email are
merged into one identity. If the dry run reports credential conflicts, agree which existing password
should remain and set `PERMINISTER_CREDENTIAL_SELECTIONS_JSON` to a JSON object mapping each reported
identity to one reported candidate reference. Repeat the dry run and resolve all errors and conflicts
before applying.

Apply the reviewed import once with:

```sh
npm run auth:perminister:apply
```

The import endpoint is idempotent, so rerunning the same manifest does not create duplicate subjects
or workspace grants. Inactive Visitoring users are imported with inactive workspace grants. The
migration transfers only identity, password verifier, and workspace membership data; it does not
move analytics data or workspace records.

## Stage and cut over

Deploy the Visitoring code with the following server-only settings:

```dotenv
VISITORING_AUTH_PROVIDER=perminister
PERMINISTER_BASE_URL=https://www.perminister.com
PERMINISTER_APP_CLIENT_ID=<client id from Perminister>
PERMINISTER_APP_CLIENT_SECRET=<client secret from Perminister>
PERMINISTER_ORGANIZATION_ID=<approved organization UUID>
PERMINISTER_PRODUCT_ID=visitoring
```

For a staging deployment, create a separate Perminister client and use the staging organization and
workspace data. Never expose the client secret or migration secret to browser code. After deployment,
verify an admin and viewer login, workspace isolation, member listing and changes, password reset,
sign-out, and the 30-day expiry. Public registration remains disabled. The Visitoring login form
continues to ask for a workspace slug and email; Perminister verifies the credentials and Visitoring
checks the resulting workspace grant before creating its app cookie.

Perminister’s current Spaces-backed auth store requires exactly one active Node.js writer process per
bucket. Its in-process queues do not coordinate independent Vercel Function instances. Keep production
cutover blocked until Perminister runs behind a single-writer deployment or moves to a transactional
shared store; do not treat this Visitoring provider switch as a way to make concurrent Perminister
writes safe.

The local auth tables and code remain available during staging. Before cutover, reverting
`VISITORING_AUTH_PROVIDER` to `local` restores the previous path. After administrators change roles,
passwords, or memberships in Perminister, those changes are not mirrored back to local `users`; a
rollback after such changes requires reconciling those changes first. Keep the local auth tables until
the central path has been stable and rollback is no longer needed.
