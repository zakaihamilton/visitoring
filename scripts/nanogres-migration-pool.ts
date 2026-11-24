import { Pool } from "pg";
import {
  closeWorkloadTunnel,
  createWorkloadPgPool,
  DEFAULT_NANOGRES_IDENTITY_URL,
  localConnectionString,
  openWorkloadTunnel,
  requestWorkloadCredential,
} from "../src/db/nanogres-tunnel";

function identityConfiguration() {
  const organizationId = process.env.NANOGRES_ORGANIZATION_ID?.trim();
  const database = process.env.NANOGRES_DATABASE?.trim();
  const role = process.env.NANOGRES_MIGRATION_ROLE?.trim();
  const endpoint = process.env.NANOGRES_IDENTITY_URL?.trim() || DEFAULT_NANOGRES_IDENTITY_URL;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!organizationId || !database || !role || !oidcToken) {
    throw new Error(
      "Set the Nanogres organization, database, migration role, and Vercel OIDC token.",
    );
  }
  return { organizationId, database, role, endpoint, oidcToken };
}

export async function createMigrationPool(): Promise<{
  pool: Pool;
  close: () => Promise<void>;
}> {
  const localUrl = localConnectionString();
  if (localUrl) {
    const pool = new Pool({
      connectionString: localUrl,
      max: 1,
      connectionTimeoutMillis: 10_000,
    });
    return { pool, close: () => pool.end() };
  }

  const target = identityConfiguration();
  const { credential, sshPrivateKey } = await requestWorkloadCredential({
    ...target,
    expectedPooling: "session",
    label: "migration",
    includeErrorDetail: true,
  });
  const tunnel = await openWorkloadTunnel(credential, sshPrivateKey);
  const pool = createWorkloadPgPool({
    credential,
    port: tunnel.port,
    max: 1,
    connectionTimeoutMillis: 10_000,
    applicationName: "visitoring-migrations",
  });
  return {
    pool,
    close: async () => {
      await pool.end().catch(() => undefined);
      await closeWorkloadTunnel(tunnel);
    },
  };
}
