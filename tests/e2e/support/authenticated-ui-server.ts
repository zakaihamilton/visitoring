import type { ChildProcess } from "node:child_process";
import { createHash, generateKeyPairSync, randomBytes, sign as signBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";
import { buildNext, startNextProduction } from "./next-production";

const organizationId = "b2746350-516c-45a8-bf2e-187104029040";
const projectId = "17e3a481-e4b3-4c83-961a-8f9924256490";
const siteId = "471d4595-9bc7-4a25-b0b4-c7d6ca28514a";
const siteKey = "vk_e2e_authenticated_dashboard_key";
const email = "e2e-admin@example.test";
const sessionToken = "e2e-local-session";
const clientId = "visitoring-authenticated-ui-test";
const clientSecret = "local-test-client-secret-only";
const stubPort = Number(process.env.AUTH_STUB_PORT ?? 4322);
const nextPort = Number(process.env.AUTH_NEXT_PORT ?? 3115);
const nextDistDir = ".next-authenticated-ui";
const databaseUrl = process.env.DATABASE_URL;
const identityOrigin = `http://127.0.0.1:${stubPort}`;
const signingKeyId = "visitoring-e2e-signing-key";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...(publicKey.export({ format: "jwk" }) as Record<string, string>),
  alg: "RS256",
  kid: signingKeyId,
  use: "sig",
};
const oauthCodes = new Map<
  string,
  { clientId: string | null; challenge: string | null; nonce: string | null; redirectUri: string | null }
>();

if (!databaseUrl) throw new Error("DATABASE_URL is required for authenticated UI tests.");
const databaseHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseHost)) {
  throw new Error("Authenticated UI tests only seed a local PostgreSQL database.");
}

const pool = new Pool({ connectionString: databaseUrl, max: 2 });
const session = {
  authenticated: true,
  account: { subjectId: "e2e-admin", email },
  organizations: [
    {
      organizationId,
      organizationName: "Northwind Analytics",
      organizationRole: "admin",
      productId: "visitoring",
      resourceRoles: [
        {
          scope: { kind: "project", organizationId, productId: "visitoring", projectId },
          role: "admin",
          actions: ["visitoring:project:read"],
        },
      ],
    },
  ],
};

function json(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function isSignedIn(request: import("node:http").IncomingMessage): boolean {
  return request.headers.authorization === `Bearer ${sessionToken}`;
}

async function requestText(request: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function requestBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  return JSON.parse(await requestText(request));
}

function signTestIdToken(nonce: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT", kid: signingKeyId });
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ iss: identityOrigin, sub: "e2e-admin", aud: clientId, iat: now, exp: now + 300, nonce });
  const input = `${header}.${payload}`;
  return `${input}.${signBytes("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

function isExpectedCallbackUri(value: string): boolean {
  try {
    const callback = new URL(value);
    return (
      callback.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(callback.hostname) &&
      callback.port === String(nextPort) &&
      callback.pathname === "/auth/perminister/callback" &&
      !callback.username &&
      !callback.password &&
      !callback.search &&
      !callback.hash
    );
  } catch {
    return false;
  }
}

const provider: Server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${stubPort}`);
  if (request.method === "GET" && url.pathname === "/.well-known/openid-configuration") {
    json(response, 200, {
      issuer: identityOrigin,
      authorization_endpoint: `${identityOrigin}/oauth/authorize`,
      token_endpoint: `${identityOrigin}/oauth/token`,
      jwks_uri: `${identityOrigin}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      id_token_signing_alg_values_supported: ["RS256"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
      scopes_supported: ["openid", "profile", "email", "perminister_api"],
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/.well-known/jwks.json") {
    response.writeHead(200, { "content-type": "application/jwk-set+json; charset=utf-8" });
    response.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }
  if (request.method === "GET" && url.pathname === "/oauth/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri") ?? "";
    if (
      url.searchParams.get("client_id") !== clientId ||
      url.searchParams.get("response_type") !== "code" ||
      url.searchParams.get("scope") !== "openid profile email perminister_api" ||
      url.searchParams.get("state")?.length !== 43 ||
      url.searchParams.get("nonce")?.length !== 43 ||
      url.searchParams.get("code_challenge_method") !== "S256" ||
      url.searchParams.get("code_challenge")?.length !== 43 ||
      !isExpectedCallbackUri(redirectUri)
    ) {
      json(response, 400, { error: "Invalid OIDC test request." });
      return;
    }
    const values = Object.fromEntries(url.searchParams.entries());
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Perminister test sign-in</title></head><body><main><h1>Perminister test sign-in</h1><form action="/oauth/authorize/continue" method="post">${Object.entries(values).map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join("\n")}<button type="submit">Continue as test user</button></form></main></body></html>`);
    return;
  }
  if (request.method === "POST" && url.pathname === "/oauth/authorize/continue") {
    const form = new URLSearchParams(await requestText(request));
    const code = randomBytes(24).toString("base64url");
    oauthCodes.set(code, {
      clientId: form.get("client_id"),
      challenge: form.get("code_challenge"),
      nonce: form.get("nonce"),
      redirectUri: form.get("redirect_uri"),
    });
    const callback = new URL(form.get("redirect_uri") ?? "");
    callback.search = new URLSearchParams({ code, state: form.get("state") ?? "" }).toString();
    response.writeHead(303, { location: callback.toString(), "cache-control": "no-store" });
    response.end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/oauth/token") {
    const basic = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.authorization ?? "");
    const decoded = basic ? Buffer.from(basic[1], "base64").toString("utf8") : "";
    const separator = decoded.indexOf(":");
    const credentials = separator >= 0
      ? [decodeURIComponent(decoded.slice(0, separator)), decodeURIComponent(decoded.slice(separator + 1))]
      : [];
    const form = new URLSearchParams(await requestText(request));
    const code = oauthCodes.get(form.get("code") ?? "");
    const challenge = createHash("sha256").update(form.get("code_verifier") ?? "").digest("base64url");
    if (
      credentials[0] !== clientId ||
      credentials[1] !== clientSecret ||
      form.get("grant_type") !== "authorization_code" ||
      !code ||
      code.clientId !== clientId ||
      code.redirectUri !== form.get("redirect_uri") ||
      code.challenge !== challenge
    ) {
      json(response, 400, { error: "invalid_grant" });
      return;
    }
    oauthCodes.delete(form.get("code") ?? "");
    json(response, 200, {
      access_token: sessionToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: "openid profile email perminister_api",
      id_token: signTestIdToken(code.nonce ?? ""),
    });
    return;
  }
  if (url.pathname === "/api/auth/consumer/session" && request.method === "GET") {
    json(
      response,
      isSignedIn(request) ? 200 : 401,
      isSignedIn(request) ? session : { error: "Sign in required." },
    );
    return;
  }
  if (url.pathname === "/api/auth/consumer/session" && request.method === "DELETE") {
    json(response, 200, { signedOut: true });
    return;
  }
  if (url.pathname === "/api/auth/consumer/members" && request.method === "GET") {
    if (!isSignedIn(request)) {
      json(response, 401, { error: "Sign in required." });
      return;
    }
    json(response, 200, {
      members: [
        { subjectId: "e2e-admin", email, role: "admin", active: true },
        { subjectId: "e2e-viewer", email: "viewer@example.test", role: "viewer", active: true },
      ],
    });
    return;
  }
  json(response, 404, { error: "Not found." });
});

async function seedDatabase() {
  await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
  await pool.query(
    `INSERT INTO projects (id, name, organization_id)
     VALUES ($1, 'Northwind analytics project', $2)`,
    [projectId, organizationId],
  );
  await pool.query(
    `INSERT INTO sites (id, project_id, name, allowed_domains, site_key_hash, site_key_prefix)
     VALUES ($1, $2, 'Northwind website', ARRAY['example.test', 'www.example.test'], $3, $4)`,
    [siteId, projectId, createHash("sha256").update(siteKey).digest("hex"), siteKey.slice(0, 11)],
  );

  await pool.query(
    `INSERT INTO sites (id, project_id, name, allowed_domains, site_key_hash, site_key_prefix, created_at)
     VALUES ('3758c8a9-0171-43dc-b15e-d58b55b8dba9', $1, 'New site', ARRAY['new.example.test'], $2, 'vk_empty', '2020-01-01')`,
    [projectId, createHash("sha256").update("vk_e2e_empty_traffic_site").digest("hex")],
  );
  await pool.query(
    `INSERT INTO site_events (project_id, site_id, visitor_id, session_id, event_name, path, referrer_host, device, created_at)
     SELECT $1, $2, 'trend-visitor-' || (n % 12), 'trend-session-' || (n % 20), 'page_view',
       CASE WHEN n % 3 = 0 THEN '/pricing' ELSE '/features' END,
       CASE WHEN n % 2 = 0 THEN 'search.example' ELSE NULL END,
       CASE WHEN n % 3 = 0 THEN 'mobile' ELSE 'desktop' END,
       '2026-09-01T08:00:00Z'::timestamptz + (n % 40) * interval '1 day'
     FROM generate_series(1, 80) AS n`,
    [projectId, siteId],
  );

  const events = [
    {
      visitorId: "e2e-visitor-abcdef1234567890",
      sessionId: "e2e-session-001",
      eventName: "signup",
      path: "/pricing",
      createdAt: "2026-10-11T12:35:00.000Z",
      properties: {
        a_context: { step: "confirm", channel: "web" },
        b_features: ["reports", "exports"],
        c_plan: "starter",
        d_trial: null,
        e_invoice: "monthly",
        f_cohort: "early-access",
      },
    },
    {
      visitorId: "e2e-visitor-abcdef1234567890",
      sessionId: "e2e-session-001",
      eventName: "page_view",
      path: "/pricing",
      createdAt: "2026-10-10T09:15:00.000Z",
      properties: { page: "pricing" },
    },
    {
      visitorId: "e2e-visitor-0123456789abcdef",
      sessionId: "e2e-session-002",
      eventName: "page_view",
      path: "/features",
      createdAt: "2026-10-08T17:20:00.000Z",
      properties: { page: "features" },
    },
  ];
  for (const event of events) {
    await pool.query(
      `INSERT INTO site_events
         (project_id, site_id, visitor_id, session_id, event_name, path, properties, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        projectId,
        siteId,
        event.visitorId,
        event.sessionId,
        event.eventName,
        event.path,
        JSON.stringify(event.properties),
        event.createdAt,
      ],
    );
  }
}

let nextServer: ChildProcess | undefined;
let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (nextServer && nextServer.exitCode === null) nextServer.kill("SIGTERM");
  await new Promise<void>((resolveClose) => provider.close(() => resolveClose()));
  await pool.query("DELETE FROM projects WHERE id = $1", [projectId]).catch(() => undefined);
  await pool.end();
  process.exitCode = exitCode;
}

async function main() {
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
  provider.listen(stubPort, "127.0.0.1");
  await new Promise<void>((resolveListen, rejectListen) => {
    provider.once("listening", resolveListen);
    provider.once("error", rejectListen);
  });
  await seedDatabase();

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NEXT_DIST_DIR: nextDistDir,
    PERMINISTER_BASE_URL: `http://127.0.0.1:${stubPort}`,
    PERMINISTER_APP_CLIENT_ID: clientId,
    PERMINISTER_APP_CLIENT_SECRET: clientSecret,
    PERMINISTER_PRODUCT_ID: "visitoring",
    RATE_LIMIT_SECRET: "visitoring-authenticated-ui-tests-only-secret",
  };
  await buildNext(env, (child) => {
    nextServer = child;
  });
  if (shuttingDown) return;

  nextServer = startNextProduction(nextPort, env);
  nextServer.once("error", () => void shutdown(1));
  nextServer.once("exit", (code) => void shutdown(code ?? 1));
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : "Authenticated UI test server failed.");
  await shutdown(1);
});
