import { createPrivateKey, generateKeyPairSync, randomBytes } from "node:crypto";
import net, { type AddressInfo, type Server } from "node:net";
import { Pool } from "pg";
import { Client as SshClient, type ClientChannel } from "ssh2";
import WebSocket, { createWebSocketStream } from "ws";

function sshUint32(value: number): Buffer {
  const result = Buffer.alloc(4);
  result.writeUInt32BE(value >>> 0);
  return result;
}

function sshString(value: Buffer | string): Buffer {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return Buffer.concat([sshUint32(bytes.length), bytes]);
}

function opensshPrivateKeyFromKeyPair(privateKeyPem: string, publicKeyDer: Buffer): string {
  const publicPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const privatePrefix = Buffer.from("302e020100300506032b657004220420", "hex");
  if (
    publicKeyDer.length !== publicPrefix.length + 32 ||
    !publicKeyDer.subarray(0, publicPrefix.length).equals(publicPrefix)
  ) {
    throw new Error("The generated SSH public key was not Ed25519.");
  }
  const privateKeyDer = Buffer.from(
    createPrivateKey(privateKeyPem).export({ format: "der", type: "pkcs8" }),
  );
  if (
    privateKeyDer.length !== privatePrefix.length + 32 ||
    !privateKeyDer.subarray(0, privatePrefix.length).equals(privatePrefix)
  ) {
    throw new Error("The generated SSH private key was not Ed25519.");
  }

  const publicKey = publicKeyDer.subarray(publicPrefix.length);
  const privateKey = Buffer.concat([privateKeyDer.subarray(privatePrefix.length), publicKey]);
  const check = randomBytes(4).readUInt32BE(0);
  const privatePayload = Buffer.concat([
    sshUint32(check),
    sshUint32(check),
    sshString("ssh-ed25519"),
    sshString(publicKey),
    sshString(privateKey),
    sshString("nanogres-workload"),
  ]);
  const paddingLength = 8 - (privatePayload.length % 8);
  const padding = Buffer.from(Array.from({ length: paddingLength }, (_, index) => index + 1));
  const publicBlob = Buffer.concat([sshString("ssh-ed25519"), sshString(publicKey)]);
  const opensshKey = Buffer.concat([
    Buffer.from("openssh-key-v1\0", "ascii"),
    sshString("none"),
    sshString("none"),
    sshString(Buffer.alloc(0)),
    sshUint32(1),
    sshString(publicBlob),
    sshString(Buffer.concat([privatePayload, padding])),
  ]);
  const encoded = opensshKey.toString("base64").match(/.{1,70}/g)?.join("\n");
  if (!encoded) throw new Error("The generated SSH private key could not be encoded.");
  return (
    "-----BEGIN OPENSSH PRIVATE KEY-----\n" +
    encoded +
    "\n-----END OPENSSH PRIVATE KEY-----\n"
  );
}


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
  pooling: "transaction" | "session";
};

type WorkloadTunnel = {
  server: Server;
  port: number;
  ssh: SshClient;
  webSocket: WebSocket;
};

function localConnectionString(): string | null {
  const outsideDevelopment =
    process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";
  if (outsideDevelopment) return null;

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

function identityConfiguration() {
  const organizationId = process.env.NANOGRES_ORGANIZATION_ID?.trim();
  const database = process.env.NANOGRES_DATABASE?.trim();
  const role = process.env.NANOGRES_MIGRATION_ROLE?.trim();
  const endpoint =
    process.env.NANOGRES_IDENTITY_URL?.trim() ||
    "https://nanogres.vercel.app/api/workload-identity";
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!organizationId || !database || !role || !oidcToken) {
    throw new Error(
      "Set the Nanogres organization, database, migration role, and Vercel OIDC token.",
    );
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("NANOGRES_IDENTITY_URL must be a clean HTTPS URL.");
  }
  return { organizationId, database, role, endpoint: url.toString(), oidcToken };
}

function sshPublicKeyFromSpki(spki: Buffer): string {
  const prefix = Buffer.from("302a300506032b6570032100", "hex");
  if (spki.length !== prefix.length + 32 || !spki.subarray(0, prefix.length).equals(prefix)) {
    throw new Error("The generated SSH key was not Ed25519.");
  }
  const algorithm = Buffer.from("ssh-ed25519");
  const algorithmLength = Buffer.alloc(4);
  algorithmLength.writeUInt32BE(algorithm.length);
  const publicKeyBytes = spki.subarray(prefix.length);
  const publicKeyLength = Buffer.alloc(4);
  publicKeyLength.writeUInt32BE(publicKeyBytes.length);
  return "ssh-ed25519 " + Buffer.concat([
    algorithmLength,
    algorithm,
    publicKeyLength,
    publicKeyBytes,
  ]).toString("base64");
}

async function requestCredential(): Promise<{
  credential: WorkloadCredential;
  sshPrivateKey: string;
}> {
  const target = identityConfiguration();
  const keyPair = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { format: "der", type: "spki" },
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
  });
  if (!Buffer.isBuffer(keyPair.publicKey) || typeof keyPair.privateKey !== "string") {
    throw new Error("The generated SSH keypair could not be encoded.");
  }

  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + target.oidcToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      organizationId: target.organizationId,
      database: target.database,
      role: target.role,
      sshPublicKey: sshPublicKeyFromSpki(keyPair.publicKey),
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const responseError: unknown = await response.json().catch(() => null);
    const message =
      responseError &&
      typeof responseError === "object" &&
      "error" in responseError &&
      typeof responseError.error === "string"
        ? ": " + responseError.error.slice(0, 256)
        : "";
    throw new Error(
      "Nanogres migration identity exchange failed (" + response.status + ")" + message + ".",
    );
  }

  const value: unknown = await response.json();
  if (!value || typeof value !== "object") {
    throw new Error("Nanogres returned an invalid migration credential.");
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
    credential.pooling !== "session"
  ) {
    throw new Error("Nanogres returned invalid migration SSH credentials.");
  }

  const expiresAt = Date.parse(credential.expiresAt);
  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() + 60_000 ||
    credential.host !== "127.0.0.1" ||
    !Number.isInteger(credential.port) ||
    credential.port < 1 ||
    credential.port > 65535 ||
    credential.sshPort !== 8443 ||
    credential.sshPath !== "/_nanogres/workload-ssh" ||
    !/^[a-f0-9]{64}$/i.test(credential.sshHostKeySha256)
  ) {
    throw new Error("Nanogres returned an invalid migration SSH endpoint.");
  }

  return {\n    credential: credential as WorkloadCredential,\n    sshPrivateKey: opensshPrivateKeyFromKeyPair(keyPair.privateKey, keyPair.publicKey),\n  };
}

async function openWorkloadTunnel(
  credential: WorkloadCredential,
  sshPrivateKey: string,
): Promise<WorkloadTunnel> {
  const address = new URL(
    credential.sshPath,
    "wss://" + credential.sshHost + ":" + credential.sshPort,
  );
  if (
    address.protocol !== "wss:" ||
    address.username ||
    address.password ||
    address.search ||
    address.hash
  ) {
    throw new Error("Nanogres returned an invalid SSH WebSocket address.");
  }

  const webSocket = new WebSocket(address, {
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
      const localAddress = server.address();
      if (!localAddress || typeof localAddress === "string") {
        server.close();
        throw new Error("The local SSH tunnel did not receive a TCP port.");
      }
      return { server, port: (localAddress as AddressInfo).port, ssh, webSocket };
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

async function closeWorkloadTunnel(tunnel: WorkloadTunnel): Promise<void> {
  await new Promise<void>((resolve) => tunnel.server.close(() => resolve()));
  tunnel.ssh.end();
  tunnel.webSocket.close();
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

  const { credential, sshPrivateKey } = await requestCredential();
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
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: "visitoring-migrations",
  });
  return {
    pool,
    close: async () => {
      await pool.end().catch(() => undefined);
      await closeWorkloadTunnel(tunnel);
    },
  };
}
