import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { headers } from "next/headers";
import { Pool } from "pg";
import {
  closeWorkloadTunnel,
  createWorkloadPgPool,
  DEFAULT_NANOGRES_IDENTITY_URL,
  localConnectionString,
  openWorkloadTunnel,
  requestWorkloadCredential,
  type WorkloadCredential,
  type WorkloadTunnel,
} from "./nanogres-tunnel";
import * as schema from "./schema";

type ConnectionKind = "runtime" | "migration";

type ConnectionHandle = {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
  expiresAt: number;
  isAlive: () => boolean;
  close: () => Promise<void>;
};

const pools = new Map<ConnectionKind, ConnectionHandle>();
const pending = new Map<ConnectionKind, Promise<ConnectionHandle>>();

async function getOidcToken(): Promise<string> {
  const fromEnvironment = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    const fromRequest = (await headers()).get("x-vercel-oidc-token")?.trim();
    if (fromRequest) return fromRequest;
  } catch {
    // Command-line migration scripts use the token pulled by `vercel env pull`.
  }
  throw new Error(
    "A Vercel workload token is required. Enable OIDC for this project or run `vercel env pull` locally.",
  );
}

function configuration(kind: ConnectionKind) {
  const organizationId = process.env.NANOGRES_ORGANIZATION_ID?.trim();
  const database = process.env.NANOGRES_DATABASE?.trim();
  const role =
    kind === "runtime"
      ? process.env.NANOGRES_RUNTIME_ROLE?.trim()
      : process.env.NANOGRES_MIGRATION_ROLE?.trim();
  const endpoint = process.env.NANOGRES_IDENTITY_URL?.trim() || DEFAULT_NANOGRES_IDENTITY_URL;
  if (!organizationId || !database || !role) {
    throw new Error(
      "Set NANOGRES_ORGANIZATION_ID, NANOGRES_DATABASE, and the matching Nanogres login role.",
    );
  }
  return { organizationId, database, role, endpoint };
}

function createLocalConnection(kind: ConnectionKind, connectionString: string): ConnectionHandle {
  const pool = new Pool({
    connectionString,
    max: kind === "runtime" ? 10 : 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  let closed = false;
  const handle: ConnectionHandle = {
    pool,
    db: drizzle(pool, { schema }),
    expiresAt: Number.POSITIVE_INFINITY,
    isAlive: () => !closed,
    close: async () => {
      if (closed) return;
      closed = true;
      await pool.end().catch(() => undefined);
    },
  };
  pool.on("error", () => {
    if (pools.get(kind) !== handle) return;
    pools.delete(kind);
    void handle.close();
  });
  return handle;
}

export async function getDatabase(kind: ConnectionKind = "runtime") {
  const inProgress = pending.get(kind);
  if (inProgress) return inProgress;

  const existing = pools.get(kind);
  if (existing && existing.expiresAt > Date.now() + 60_000 && existing.isAlive()) {
    return existing;
  }
  if (existing) {
    pools.delete(kind);
    void existing.close().catch(() => undefined);
  }

  const next = (async () => {
    const localUrl = localConnectionString();
    if (localUrl) {
      const localHandle = createLocalConnection(kind, localUrl);
      pools.set(kind, localHandle);
      return localHandle;
    }

    const target = configuration(kind);
    const oidcToken = await getOidcToken();
    const { credential, sshPrivateKey }: { credential: WorkloadCredential; sshPrivateKey: string } =
      await requestWorkloadCredential({
        ...target,
        oidcToken,
        expectedPooling: kind === "runtime" ? "transaction" : "session",
        label: "workload",
      });
    const tunnel: WorkloadTunnel = await openWorkloadTunnel(credential, sshPrivateKey);
    const pool = createWorkloadPgPool({
      credential,
      port: tunnel.port,
      max: kind === "runtime" ? 10 : 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      maxLifetimeSeconds: 600,
    });
    const handle: ConnectionHandle = {
      pool,
      db: drizzle(pool, { schema }),
      expiresAt: Date.parse(credential.expiresAt),
      isAlive: tunnel.isAlive,
      close: async () => {
        await pool.end().catch(() => undefined);
        await closeWorkloadTunnel(tunnel);
      },
    };
    const invalidate = () => {
      if (pools.get(kind) !== handle) return;
      pools.delete(kind);
      void handle.close();
    };
    tunnel.ssh.once("close", invalidate);
    tunnel.webSocket.once("close", invalidate);
    tunnel.webSocket.once("error", invalidate);
    pool.on("error", invalidate);
    pools.set(kind, handle);
    return handle;
  })().finally(() => {
    pending.delete(kind);
  });
  pending.set(kind, next);
  return next;
}

export async function getDb() {
  return (await getDatabase("runtime")).db;
}

export async function getPool() {
  return (await getDatabase("runtime")).pool;
}

export async function endDatabasePools() {
  const active = Array.from(pools.values());
  pools.clear();
  await Promise.all(active.map((handle) => handle.close()));
}
