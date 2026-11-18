import "server-only";

import { generateKeyPairSync } from "node:crypto";
import net, { type AddressInfo, type Server } from "node:net";
import { headers } from "next/headers";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Client as SshClient, type ClientChannel } from "ssh2";
import WebSocket, { createWebSocketStream } from "ws";
import * as schema from "./schema";

type ConnectionKind = "runtime" | "migration";
type WorkloadCredential = {
  clientCert: string;
  clientKey: string;
  expiresAt: string;
  host: string;
  port: number;
  user: string;
  database: string;
  tlsServerName: string;
  sshHost: string;
  sshPort: number;
  sshPath: string;
  sshUsername: string;
  sshHostKeySha256: string;
};

type ConnectionHandle = {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
  expiresAt: number;
  close: () => Promise<void>;
};

type WorkloadTunnel = {
  server: Server;
  port: number;
  ssh: SshClient;
  webSocket: WebSocket;
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
  const endpoint =
    process.env.NANOGRES_IDENTITY_URL?.trim() ||
    "https://nanogres.vercel.app/api/workload-identity";
  if (!organizationId || !database || !role) {
    throw new Error(
      "Set NANOGRES_ORGANIZATION_ID, NANOGRES_DATABASE, and the matching Nanogres login role.",
    );
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("NANOGRES_IDENTITY_URL must be a clean HTTPS URL.");
  }
  return { organizationId, database, role, endpoint: url.toString() };
}

function sshPublicKeyFromSpki(spki: Buffer): string {
  const ed25519SpkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  if (
    spki.length !== ed25519SpkiPrefix.length + 32 ||
    !spki.subarray(0, ed25519SpkiPrefix.length).equals(ed25519SpkiPrefix)
  ) {
    throw new Error("The generated SSH key was not Ed25519.");
  }
  const algorithm = Buffer.from("ssh-ed25519");
  const algorithmLength = Buffer.alloc(4);
  algorithmLength.writeUInt32BE(algorithm.length);
  const publicKeyBytes = spki.subarray(ed25519SpkiPrefix.length);
  const publicKeyLength = Buffer.alloc(4);
  publicKeyLength.writeUInt32BE(publicKeyBytes.length);
  const blob = Buffer.concat([algorithmLength, algorithm, publicKeyLength, publicKeyBytes]);
  return `ssh-ed25519 ${blob.toString("base64")}`;
}

async function requestCredential(kind: ConnectionKind): Promise<{
  credential: WorkloadCredential;
  sshPrivateKey: string;
}> {
  const target = configuration(kind);
  const token = await getOidcToken();
  const keyPair = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { format: "der", type: "spki" },
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
  });
  if (!Buffer.isBuffer(keyPair.publicKey) || typeof keyPair.privateKey !== "string") {
    throw new Error("The generated SSH keypair could not be encoded.");
  }
  const sshPublicKey = sshPublicKeyFromSpki(keyPair.publicKey);
  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId: target.organizationId,
      database: target.database,
      role: target.role,
      sshPublicKey,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Nanogres workload identity exchange failed (${response.status}).`);
  }
  const credential = (await response.json()) as Partial<WorkloadCredential>;
  if (
    typeof credential.clientCert !== "string" ||
    typeof credential.clientKey !== "string" ||
    typeof credential.expiresAt !== "string" ||
    typeof credential.host !== "string" ||
    typeof credential.port !== "number" ||
    typeof credential.user !== "string" ||
    typeof credential.database !== "string" ||
    typeof credential.tlsServerName !== "string" ||
    typeof credential.sshHost !== "string" ||
    typeof credential.sshPort !== "number" ||
    typeof credential.sshPath !== "string" ||
    typeof credential.sshUsername !== "string" ||
    typeof credential.sshHostKeySha256 !== "string"
  ) {
    throw new Error("Nanogres returned invalid workload SSH credentials.");
  }
  if (
    credential.host !== "127.0.0.1" ||
    !Number.isInteger(credential.port) || credential.port < 1 || credential.port > 65535 ||
    credential.sshPort !== 8443 ||
    credential.sshPath !== "/_nanogres/workload-ssh" ||
    !/^[a-f0-9]{64}$/i.test(credential.sshHostKeySha256)
  ) {
    throw new Error("Nanogres returned an invalid workload SSH endpoint.");
  }
  const expiresAt = Date.parse(credential.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 60_000) {
    throw new Error("Nanogres returned an expired workload certificate.");
  }
  return { credential: credential as WorkloadCredential, sshPrivateKey: keyPair.privateKey };
}

async function openWorkloadTunnel(
  credential: WorkloadCredential,
  sshPrivateKey: string,
): Promise<WorkloadTunnel> {
  const url = new URL(credential.sshPath, `wss://${credential.sshHost}:${credential.sshPort}`);
  if (url.protocol !== "wss:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Nanogres returned an invalid SSH WebSocket address.");
  }
  const webSocket = new WebSocket(url, {
    followRedirects: false,
    handshakeTimeout: 10_000,
    perMessageDeflate: false,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        webSocket.off("error", onError);
        resolve();
      };
      const onError = (error: Error) => {
        webSocket.off("open", onOpen);
        reject(error);
      };
      webSocket.once("open", onOpen);
      webSocket.once("error", onError);
    });

    const ssh = new SshClient();
    const transport = createWebSocketStream(webSocket, { allowSynchronousEvents: true });
    try {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          ssh.off("error", onError);
          resolve();
        };
        const onError = (error: Error) => {
          ssh.off("ready", onReady);
          reject(error);
        };
        ssh.once("ready", onReady);
        ssh.once("error", onError);
        ssh.connect({
          sock: transport,
          host: credential.sshHost,
          port: credential.sshPort,
          username: credential.sshUsername,
          privateKey: sshPrivateKey,
          hostHash: "sha256",
          hostVerifier: (hash) =>
            typeof hash === "string" &&
            hash.toLowerCase() === credential.sshHostKeySha256.toLowerCase(),
          readyTimeout: 10_000,
          keepaliveInterval: 15_000,
          keepaliveCountMax: 3,
        });
      });

      const server = net.createServer((localSocket) => {
        ssh.forwardOut("127.0.0.1", 0, credential.host, credential.port, (error, channel: ClientChannel) => {
          if (error) {
            localSocket.destroy(error);
            return;
          }
          localSocket.on("error", () => channel.destroy());
          channel.on("error", () => localSocket.destroy());
          localSocket.on("close", () => channel.close());
          channel.on("close", () => localSocket.destroy());
          localSocket.pipe(channel).pipe(localSocket);
        });
      });
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      });
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        throw new Error("The local SSH tunnel did not receive a TCP port.");
      }
      return { server, port: (address as AddressInfo).port, ssh, webSocket };
    } catch (error) {
      ssh.end();
      transport.destroy();
      throw error;
    }
  } catch (error) {
    webSocket.terminate();
    throw error;
  }
}

function localConnectionString(): string | null {
  const vercelDeploymentOutsideDevelopment =
    process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";
  if (vercelDeploymentOutsideDevelopment) return null;

  const isCi = process.env.CI === "true";
  const connectionString =
    process.env.LOCAL_DATABASE_URL?.trim() ||
    ((process.env.NODE_ENV === "test" || isCi) ? process.env.DATABASE_URL?.trim() : "") ||
    "";
  if (!connectionString) return null;

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("The local PostgreSQL URL must be valid.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    throw new Error("Local PostgreSQL URLs must point to localhost.");
  }
  return connectionString;
}

export async function getDatabase(kind: ConnectionKind = "runtime") {
  const existing = pools.get(kind);
  if (existing && existing.expiresAt > Date.now() + 60_000) return existing;
  const inProgress = pending.get(kind);
  if (inProgress) return inProgress;

  const next = (async () => {
    const localUrl = localConnectionString();
    if (localUrl) {
      const pool = new Pool({
        connectionString: localUrl,
        max: kind === "runtime" ? 10 : 1,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
      const handle = { pool, db: drizzle(pool, { schema }), expiresAt: Number.POSITIVE_INFINITY };
      const complete: ConnectionHandle = {
        ...handle,
        close: () => pool.end(),
      };
      pools.set(kind, complete);
      return complete;
    }

    const { credential, sshPrivateKey } = await requestCredential(kind);
    const tunnel = await openWorkloadTunnel(credential, sshPrivateKey);
    const pool = new Pool({
      host: "127.0.0.1",
      port: tunnel.port,
      database: credential.database,
      user: credential.user,
      ssl: {
        cert: credential.clientCert,
        key: credential.clientKey,
        servername: credential.tlsServerName,
        rejectUnauthorized: true,
      },
      max: kind === "runtime" ? 10 : 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      maxLifetimeSeconds: 600,
    });
    const handle: ConnectionHandle = {
      pool,
      db: drizzle(pool, { schema }),
      expiresAt: Date.parse(credential.expiresAt),
      close: async () => {
        await pool.end().catch(() => undefined);
        tunnel.server.close();
        tunnel.ssh.end();
        tunnel.webSocket.close();
      },
    };
    pools.set(kind, handle);
    if (existing) void existing.close();
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
