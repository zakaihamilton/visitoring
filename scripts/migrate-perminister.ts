import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

let closePool: (() => Promise<void>) | undefined;

type UserRow = {
  id: string;
  workspaceId: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
};

type ImportResponse = {
  dryRun?: boolean;
  applied?: boolean;
  identities?: number;
  memberships?: number;
  conflicts?: Array<{ identity: string; candidates: string[] }>;
  errors?: string[];
  error?: string;
};

const IMPORT_LIMIT_BYTES = 25 * 1024 * 1024;
const REPORT_LIMIT_BYTES = IMPORT_LIMIT_BYTES - 1024;

function importSecret(): string {
  const secret = process.env.PERMINISTER_LEGACY_IMPORT_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error(
      "Set PERMINISTER_LEGACY_IMPORT_SECRET to the configured 32-character minimum secret.",
    );
  }
  return secret;
}

function credentialSelections(): Record<string, string> | undefined {
  const input = process.env.PERMINISTER_CREDENTIAL_SELECTIONS_JSON?.trim();
  if (!input) return undefined;
  const parsed: unknown = JSON.parse(input);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("PERMINISTER_CREDENTIAL_SELECTIONS_JSON must be a JSON object.");
  }
  for (const [identity, candidate] of Object.entries(parsed)) {
    if (!identity || typeof candidate !== "string" || !candidate) {
      throw new Error("Credential selections must map identity keys to candidate references.");
    }
  }
  return parsed as Record<string, string>;
}

function printReport(value: ImportResponse, httpStatus: number): void {
  const report = {
    httpStatus,
    dryRun: value.dryRun ?? null,
    applied: value.applied ?? false,
    identities: value.identities ?? null,
    memberships: value.memberships ?? null,
    conflicts: value.conflicts ?? [],
    errors: value.errors ?? (value.error ? [value.error] : []),
  };
  console.log(JSON.stringify(report, null, 2));
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  for (const argument of args) {
    if (argument !== "--apply" && argument !== "--dry-run") {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (args.has("--apply") && args.has("--dry-run")) {
    throw new Error("Choose either --apply or --dry-run.");
  }
  const dryRun = !args.has("--apply");
  const baseUrl = process.env.PERMINISTER_BASE_URL?.trim() || "https://www.perminister.com";
  const organizationId = process.env.PERMINISTER_ORGANIZATION_ID?.trim() ?? "";
  if (!organizationId)
    throw new Error("Set PERMINISTER_ORGANIZATION_ID before importing accounts.");
  if (!process.env.DATABASE_URL?.trim())
    throw new Error("Set DATABASE_URL to the Visitoring database.");

  const { db, pool } = await import("@/db");
  closePool = () => pool.end();
  const { users } = await import("@/db/schema");
  const rows = (await db.select().from(users)) as UserRow[];
  const selections = credentialSelections();
  const manifest = {
    dryRun,
    visitoring: {
      organizationId,
      users: rows.map(({ id, email, passwordHash }) => ({
        id,
        email: email.trim().toLowerCase(),
        passwordHash,
      })),
      memberships: rows.map(({ id, workspaceId, role, isActive }) => ({
        userId: id,
        workspaceId,
        role: role === "admin" ? "admin" : "viewer",
        active: isActive,
      })),
    },
    ...(selections ? { credentialSelections: selections } : {}),
  };
  const body = JSON.stringify(manifest);
  const byteLength = Buffer.byteLength(body, "utf8");
  if (byteLength > REPORT_LIMIT_BYTES) {
    throw new Error(
      `The migration manifest is ${byteLength} bytes; the Perminister endpoint accepts at most ${IMPORT_LIMIT_BYTES} bytes.`,
    );
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new Error("PERMINISTER_BASE_URL must be a valid URL.");
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (
    (base.protocol !== "https:" &&
      !(base.protocol === "http:" && isLoopback && process.env.NODE_ENV !== "production")) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("PERMINISTER_BASE_URL must use HTTPS outside local development.");
  }

  const response = await fetch(new URL("/api/auth/consumer/migrations/legacy", base), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Perminister-Migration-Secret": importSecret(),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  let result: ImportResponse;
  try {
    result = (await response.json()) as ImportResponse;
  } catch {
    throw new Error(`Perminister returned an invalid response (HTTP ${response.status}).`);
  }
  printReport(result, response.status);
  if (!response.ok) process.exitCode = 1;
  if (response.ok && !dryRun && result.applied !== true) process.exitCode = 1;
  if (dryRun && response.ok && (result.errors?.length || result.conflicts?.length)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Perminister migration failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool?.();
  });
