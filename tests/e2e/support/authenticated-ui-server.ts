import { createHash } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";
import { buildNext, startNextProduction } from "./next-production";

const organizationId = "b2746350-516c-45a8-bf2e-187104029040";
const workspaceId = "17e3a481-e4b3-4c83-961a-8f9924256490";
const siteId = "471d4595-9bc7-4a25-b0b4-c7d6ca28514a";
const siteKey = "vk_e2e_authenticated_dashboard_key";
const email = "e2e-admin@example.test";
const password = "e2e-local-password";
const sessionToken = "e2e-local-session";
const stubPort = Number(process.env.AUTH_STUB_PORT ?? 4322);
const nextPort = Number(process.env.AUTH_NEXT_PORT ?? 3115);
const nextDistDir = ".next-authenticated-ui";
const databaseUrl = process.env.DATABASE_URL;

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
          scope: { kind: "workspace", organizationId, productId: "visitoring", workspaceId },
          role: "admin",
          actions: ["visitoring:workspace:read"],
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

async function requestBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const provider: Server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${stubPort}`);
  if (request.method === "POST" && url.pathname === "/api/auth/consumer/login") {
    const body = (await requestBody(request)) as { identifier?: string; password?: string };
    if (body.identifier !== email || body.password !== password) {
      json(response, 401, { error: "Invalid credentials." });
      return;
    }
    json(response, 200, { ...session, sessionToken });
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
  await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
  await pool.query(
    `INSERT INTO workspaces (id, name, organization_id)
     VALUES ($1, 'Northwind analytics workspace', $2)`,
    [workspaceId, organizationId],
  );
  await pool.query(
    `INSERT INTO sites (id, workspace_id, name, allowed_domains, site_key_hash, site_key_prefix)
     VALUES ($1, $2, 'Northwind website', ARRAY['example.test', 'www.example.test'], $3, $4)`,
    [siteId, workspaceId, createHash("sha256").update(siteKey).digest("hex"), siteKey.slice(0, 11)],
  );

  await pool.query(
    `INSERT INTO sites (id, workspace_id, name, allowed_domains, site_key_hash, site_key_prefix, created_at)
     VALUES ('3758c8a9-0171-43dc-b15e-d58b55b8dba9', $1, 'New site', ARRAY['new.example.test'], $2, 'vk_empty', '2020-01-01')`,
    [workspaceId, createHash("sha256").update("vk_e2e_empty_traffic_site").digest("hex")],
  );
  await pool.query(
    `INSERT INTO site_events (workspace_id, site_id, visitor_id, session_id, event_name, path, referrer_host, device, created_at)
     SELECT $1, $2, 'trend-visitor-' || (n % 12), 'trend-session-' || (n % 20), 'page_view',
       CASE WHEN n % 3 = 0 THEN '/pricing' ELSE '/features' END,
       CASE WHEN n % 2 = 0 THEN 'search.example' ELSE NULL END,
       CASE WHEN n % 3 = 0 THEN 'mobile' ELSE 'desktop' END,
       '2026-09-01T08:00:00Z'::timestamptz + (n % 40) * interval '1 day'
     FROM generate_series(1, 80) AS n`,
    [workspaceId, siteId],
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
         (workspace_id, site_id, visitor_id, session_id, event_name, path, properties, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        workspaceId,
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
  await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]).catch(() => undefined);
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
    PERMINISTER_APP_CLIENT_ID: "visitoring-authenticated-ui-test",
    PERMINISTER_APP_CLIENT_SECRET: "local-test-client-secret-only",
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
