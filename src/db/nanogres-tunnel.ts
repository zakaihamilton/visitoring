import net, { type AddressInfo, type Server } from "node:net";
import { Pool } from "pg";
import { type ClientChannel, Client as SshClient, utils as sshUtils } from "ssh2";
import WebSocket, { createWebSocketStream } from "ws";

export const DEFAULT_NANOGRES_IDENTITY_URL = "https://nanogres.vercel.app/api/workload-identity";

export type WorkloadCredential = {
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
  pooling: "transaction" | "session";
};

export type WorkloadTunnel = {
  server: Server;
  port: number;
  ssh: SshClient;
  webSocket: WebSocket;
  isAlive: () => boolean;
};

type RequestWorkloadCredentialOptions = {
  organizationId: string;
  database: string;
  role: string;
  endpoint: string;
  oidcToken: string;
  expectedPooling: "transaction" | "session";
  label?: "workload" | "migration";
  includeErrorDetail?: boolean;
};

type CreateWorkloadPgPoolOptions = {
  credential: WorkloadCredential;
  port: number;
  max: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxLifetimeSeconds?: number;
  applicationName?: string;
};

export function localConnectionString(): string | null {
  const vercelDeploymentOutsideDevelopment =
    process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";
  if (vercelDeploymentOutsideDevelopment) return null;

  const isCi = process.env.CI === "true";
  const connectionString =
    process.env.LOCAL_DATABASE_URL?.trim() ||
    (process.env.NODE_ENV === "test" || isCi ? process.env.DATABASE_URL?.trim() : "") ||
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

export async function requestWorkloadCredential(options: RequestWorkloadCredentialOptions): Promise<{
  credential: WorkloadCredential;
  sshPrivateKey: string;
}> {
  const url = new URL(options.endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("NANOGRES_IDENTITY_URL must be a clean HTTPS URL.");
  }

  const keyPair = sshUtils.generateKeyPairSync("ed25519");
  const [algorithm, encodedKey] = keyPair.public.trim().split(/\s+/, 3);
  if (
    algorithm !== "ssh-ed25519" ||
    !encodedKey ||
    !keyPair.private.includes("BEGIN OPENSSH PRIVATE KEY")
  ) {
    throw new Error("The SSH library could not generate an Ed25519 OpenSSH keypair.");
  }
  const sshPublicKey = `${algorithm} ${encodedKey}`;

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.oidcToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId: options.organizationId,
      database: options.database,
      role: options.role,
      sshPublicKey,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });

  const label = options.label ?? "workload";
  if (!response.ok) {
    let detail = "";
    if (options.includeErrorDetail) {
      const responseError: unknown = await response.json().catch(() => null);
      if (
        responseError &&
        typeof responseError === "object" &&
        "error" in responseError &&
        typeof responseError.error === "string"
      ) {
        detail = `: ${responseError.error.slice(0, 256)}`;
      }
    }
    throw new Error(`Nanogres ${label} identity exchange failed (${response.status})${detail}.`);
  }

  const value: unknown = await response.json();
  if (!value || typeof value !== "object") {
    throw new Error(`Nanogres returned an invalid ${label} credential.`);
  }
  const credential = value as Partial<WorkloadCredential>;
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
    typeof credential.sshHostKeySha256 !== "string" ||
    (credential.pooling !== "transaction" && credential.pooling !== "session")
  ) {
    throw new Error(`Nanogres returned invalid ${label} SSH credentials.`);
  }
  if (credential.pooling !== options.expectedPooling) {
    throw new Error(`Nanogres returned an unexpected ${label} pooling mode.`);
  }
  const expiresAt = Date.parse(credential.expiresAt);
  if (
    credential.host !== "127.0.0.1" ||
    !Number.isInteger(credential.port) ||
    credential.port < 1 ||
    credential.port > 65535 ||
    credential.sshPort !== 8443 ||
    credential.sshPath !== "/_nanogres/workload-ssh" ||
    !/^[a-f0-9]{64}$/i.test(credential.sshHostKeySha256)
  ) {
    throw new Error(`Nanogres returned an invalid ${label} SSH endpoint.`);
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 60_000) {
    throw new Error(`Nanogres returned an expired ${label} certificate.`);
  }
  return { credential: credential as WorkloadCredential, sshPrivateKey: keyPair.private };
}

export async function openWorkloadTunnel(
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
    const transport = createWebSocketStream(webSocket);
    let closed = false;
    const markClosed = () => {
      closed = true;
    };
    webSocket.on("close", markClosed);
    webSocket.on("error", markClosed);
    ssh.on("close", markClosed);
    ssh.on("end", markClosed);
    ssh.on("error", markClosed);
    transport.on("close", markClosed);
    transport.on("error", markClosed);

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
          hostVerifier: (hash: Buffer | string) => {
            const fingerprint = typeof hash === "string" ? hash : hash.toString("hex");
            return fingerprint.toLowerCase() === credential.sshHostKeySha256.toLowerCase();
          },
          readyTimeout: 10_000,
          keepaliveInterval: 15_000,
          keepaliveCountMax: 3,
        });
      });
      ssh.on("error", () => {
        if (webSocket.readyState === WebSocket.OPEN) webSocket.terminate();
      });

      const server = net.createServer((localSocket) => {
        ssh.forwardOut(
          "127.0.0.1",
          0,
          credential.host,
          credential.port,
          (error, channel: ClientChannel) => {
            if (error) {
              localSocket.destroy(error);
              return;
            }
            localSocket.on("error", () => channel.destroy());
            channel.on("error", () => localSocket.destroy());
            localSocket.on("close", () => channel.close());
            channel.on("close", () => localSocket.destroy());
            localSocket.pipe(channel).pipe(localSocket);
          },
        );
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
      return {
        server,
        port: (address as AddressInfo).port,
        ssh,
        webSocket,
        isAlive: () => !closed && webSocket.readyState === WebSocket.OPEN,
      };
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

export async function closeWorkloadTunnel(tunnel: WorkloadTunnel): Promise<void> {
  await new Promise<void>((resolve) => tunnel.server.close(() => resolve()));
  await new Promise<void>((resolve) => {
    const onClose = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      tunnel.ssh.off("close", onClose);
      resolve();
    }, 1_000);
    timer.unref();
    tunnel.ssh.once("close", onClose);
    tunnel.ssh.end();
  });
  if (tunnel.webSocket.readyState === WebSocket.OPEN) tunnel.webSocket.close();
}

export function createWorkloadPgPool(options: CreateWorkloadPgPoolOptions): Pool {
  const { credential, port, max } = options;
  return new Pool({
    host: "127.0.0.1",
    port,
    database: credential.database,
    user: credential.user,
    ssl: {
      cert: credential.clientCert,
      key: credential.clientKey,
      servername: credential.tlsServerName,
      rejectUnauthorized: true,
    },
    max,
    ...(options.idleTimeoutMillis !== undefined
      ? { idleTimeoutMillis: options.idleTimeoutMillis }
      : {}),
    ...(options.connectionTimeoutMillis !== undefined
      ? { connectionTimeoutMillis: options.connectionTimeoutMillis }
      : {}),
    ...(options.maxLifetimeSeconds !== undefined
      ? { maxLifetimeSeconds: options.maxLifetimeSeconds }
      : {}),
    ...(options.applicationName !== undefined ? { application_name: options.applicationName } : {}),
  });
}
