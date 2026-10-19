import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

export const PERMINISTER_SESSION_COOKIE = "visitoring_session";
const VISITORING_PRODUCT_ID = "visitoring";

export type VisitoringRole = "admin" | "viewer";
type VisitoringOrganizationRole = "owner" | "admin" | "member";
export type VisitoringWorkspaceChoice = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: VisitoringRole;
};
export type VisitoringOrganizationChoice = {
  organizationId: string;
  organizationName: string;
};
type VisitoringWorkspaceMember = {
  id: string;
  email: string | null;
  role: VisitoringRole;
  isActive: boolean;
};

export type VisitoringCurrentUser = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  organizationId: string;
  organizationName: string;
  email: string | null;
  role: VisitoringRole;
};

type ResourceRole = {
  scope: {
    kind: string;
    organizationId?: string;
    productId?: string;
    workspaceId?: string;
  };
  role: string | null;
  actions: string[];
};

type ConsumerOrganization = {
  organizationId: string;
  organizationName: string;
  organizationRole: VisitoringOrganizationRole;
  productId: string;
  resourceRoles: ResourceRole[];
};

type ConsumerSession = {
  authenticated: true;
  account: {
    subjectId: string;
    email: string | null;
    username?: string | null;
  };
  organizations: ConsumerOrganization[];
};

type ConsumerLogin = ConsumerSession & { sessionToken: string };

export class PerministerApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PerministerApiError";
  }
}

type PerministerRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** `null` explicitly omits a bearer token; `undefined` reads the Visitoring session cookie. */
  token?: string | null;
};

type PerministerFailure = "timeout" | "transport" | "upstream" | "invalid_response";

function operationForPath(path: string): string {
  const pathname = new URL(path, "https://perminister.invalid").pathname;
  if (pathname.endsWith("/consumer/login")) return "login";
  if (pathname.endsWith("/consumer/token")) return "token_exchange";
  if (pathname.endsWith("/consumer/session")) return "session";
  if (pathname.endsWith("/consumer/members")) return "members";
  if (pathname.includes("/consumer/workspaces")) return "workspace_grants";
  return "other";
}

function logPerministerFailure(input: {
  operation: string;
  method: string;
  failure: PerministerFailure;
  status: number | null;
  startedAt: number;
}): void {
  console.error(
    JSON.stringify({
      event: "perminister_request_failed",
      dependency: "perminister",
      operation: input.operation,
      method: input.method,
      failure: input.failure,
      status: input.status,
      durationMs: Math.max(0, Date.now() - input.startedAt),
    }),
  );
}

function configuration() {
  const baseUrl = process.env.PERMINISTER_BASE_URL?.trim() || "https://www.perminister.com";
  const clientId = process.env.PERMINISTER_APP_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.PERMINISTER_APP_CLIENT_SECRET?.trim() ?? "";
  const productId =
    process.env.PERMINISTER_PRODUCT_ID?.trim().toLowerCase() || VISITORING_PRODUCT_ID;
  let origin: URL;
  try {
    origin = new URL(baseUrl);
  } catch {
    throw new Error("PERMINISTER_BASE_URL must be a valid HTTPS URL.");
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (
    (origin.protocol !== "https:" && !(origin.protocol === "http:" && isLoopback)) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("PERMINISTER_BASE_URL must be a valid HTTPS URL.");
  }
  if (!clientId || !clientSecret) {
    throw new Error("Perminister app client settings are required.");
  }
  if (productId !== VISITORING_PRODUCT_ID) {
    throw new Error(`PERMINISTER_PRODUCT_ID must be ${VISITORING_PRODUCT_ID}.`);
  }
  return { baseUrl: origin, clientId, clientSecret, productId };
}

export function perministerClientSecretForSso(): string {
  return configuration().clientSecret;
}

export function perministerAuthorizationUrl(
  state: string,
  challenge: string,
  appOrigin: string,
): string {
  const config = configuration();
  const redirectUri = new URL("/auth/perminister/callback", appOrigin);
  const url = new URL("/oauth/authorize", config.baseUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri.toString(),
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function requestPerminister<T>(
  path: string,
  options: PerministerRequestOptions = {},
): Promise<T> {
  const config = configuration();
  const method = options.method ?? "GET";
  const operation = operationForPath(path);
  let token = options.token;
  if (token === undefined) {
    token = (await cookies()).get(PERMINISTER_SESSION_COOKIE)?.value ?? null;
    if (!token) throw new PerministerApiError(401, "Authentication is required.");
  }

  const headers = new Headers({
    Accept: "application/json",
    "X-Perminister-Client-Id": config.clientId,
    "X-Perminister-Client-Secret": config.clientSecret,
  });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const timeoutSignal = AbortSignal.timeout(10_000);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(new URL(path, config.baseUrl), {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      cache: "no-store",
      redirect: "error",
      signal: timeoutSignal,
    });
  } catch (error) {
    const failure =
      timeoutSignal.aborted || (error instanceof Error && error.name === "TimeoutError")
        ? "timeout"
        : "transport";
    logPerministerFailure({
      operation,
      method,
      failure,
      status: null,
      startedAt,
    });
    throw new PerministerApiError(503, "Perminister is temporarily unavailable.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch (error) {
    if (response.ok) {
      const failure: PerministerFailure = timeoutSignal.aborted
        ? "timeout"
        : error instanceof SyntaxError
          ? "invalid_response"
          : "transport";
      logPerministerFailure({
        operation,
        method,
        failure,
        status: response.status,
        startedAt,
      });
      throw new PerministerApiError(
        503,
        failure === "invalid_response"
          ? "Perminister returned an invalid response."
          : "Perminister is temporarily unavailable.",
      );
    }
  }
  if (!response.ok) {
    if (response.status >= 500) {
      logPerministerFailure({
        operation,
        method,
        failure: "upstream",
        status: response.status,
        startedAt,
      });
    }
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Perminister rejected the request.";
    throw new PerministerApiError(response.status, message);
  }
  return payload as T;
}

export function loginWithPerminister(identifier: string, password: string): Promise<ConsumerLogin> {
  return requestPerminister<ConsumerLogin>("/api/auth/consumer/login", {
    method: "POST",
    token: null,
    body: { identifier, password },
  });
}

export function exchangePerministerAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<ConsumerLogin> {
  return requestPerminister<ConsumerLogin>("/api/auth/consumer/token", {
    method: "POST",
    token: null,
    body: {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    },
  });
}

export function readPerministerSession(token: string): Promise<ConsumerSession> {
  return requestPerminister<ConsumerSession>("/api/auth/consumer/session", { token });
}

export async function revokePerministerSession(token: string): Promise<void> {
  await requestPerminister<{ signedOut: boolean }>("/api/auth/consumer/session", {
    method: "DELETE",
    token,
  });
}

export function visitoringOrganizations(auth: ConsumerSession): VisitoringOrganizationChoice[] {
  const config = configuration();
  const organizations = new Map<string, VisitoringOrganizationChoice>();
  for (const organization of auth.organizations) {
    if (organization.productId !== config.productId) continue;
    const organizationId = organization.organizationId.toLowerCase();
    if (!organizations.has(organizationId)) {
      organizations.set(organizationId, {
        organizationId,
        organizationName: organization.organizationName,
      });
    }
  }
  return [...organizations.values()].sort(
    (left, right) =>
      left.organizationName.localeCompare(right.organizationName) ||
      left.organizationId.localeCompare(right.organizationId),
  );
}

export function visitoringOrganizationForId(
  auth: ConsumerSession,
  organizationId: string,
): ConsumerOrganization | null {
  const config = configuration();
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = auth.organizations.find(
    (item) =>
      item.organizationId.toLowerCase() === normalizedOrganizationId &&
      item.productId === config.productId,
  );
  return organization ?? null;
}

export function isVisitoringOrganizationAdmin(
  auth: ConsumerSession,
  organizationId: string,
): boolean {
  const organization = visitoringOrganizationForId(auth, organizationId);
  return organization?.organizationRole === "owner" || organization?.organizationRole === "admin";
}

export async function bootstrapVisitoringWorkspaceAdmin(
  organizationId: string,
  workspaceId: string,
): Promise<void> {
  const result = await requestPerminister<unknown>("/api/auth/consumer/workspaces", {
    method: "POST",
    body: { organizationId, workspaceId },
  });
  if (
    typeof result !== "object" ||
    result === null ||
    !("granted" in result) ||
    result.granted !== true
  ) {
    throw new PerministerApiError(503, "Perminister returned an invalid workspace grant response.");
  }
}

export async function revokeVisitoringWorkspaceGrants(
  organizationId: string,
  workspaceId: string,
): Promise<void> {
  const result = await requestPerminister<unknown>(
    `/api/auth/consumer/workspaces/${encodeURIComponent(workspaceId)}`,
    { method: "DELETE", body: { organizationId } },
  );
  if (
    typeof result !== "object" ||
    result === null ||
    !("revoked" in result) ||
    result.revoked !== true
  ) {
    throw new PerministerApiError(
      503,
      "Perminister returned an invalid workspace revocation response.",
    );
  }
}

function visitoringRoleForWorkspace(
  organization: ConsumerOrganization,
  organizationId: string,
  workspaceId: string,
): VisitoringRole | null {
  if (organization.organizationRole === "owner" || organization.organizationRole === "admin") {
    return "admin";
  }

  const config = configuration();
  const grants = organization.resourceRoles.filter(
    (item) =>
      item.scope.kind === "workspace" &&
      item.scope.organizationId?.toLowerCase() === organizationId &&
      item.scope.productId === config.productId &&
      item.scope.workspaceId === workspaceId &&
      (item.role === "admin" || item.role === "viewer") &&
      item.actions.includes("visitoring:workspace:read"),
  );
  if (grants.some((item) => item.role === "admin")) return "admin";
  if (grants.some((item) => item.role === "viewer")) return "viewer";
  return null;
}

export async function visitoringWorkspacesForOrganization(
  auth: ConsumerSession,
  organizationId: string,
): Promise<VisitoringWorkspaceChoice[]> {
  const config = configuration();
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = visitoringOrganizationForId(auth, organizationId);
  if (!organization) return [];

  const isOrganizationAdmin =
    organization.organizationRole === "owner" || organization.organizationRole === "admin";
  const workspaceIds = isOrganizationAdmin
    ? []
    : [
        ...new Set(
          organization.resourceRoles
            .filter(
              (item) =>
                item.scope.kind === "workspace" &&
                item.scope.organizationId?.toLowerCase() === normalizedOrganizationId &&
                item.scope.productId === config.productId &&
                typeof item.scope.workspaceId === "string" &&
                (item.role === "admin" || item.role === "viewer") &&
                item.actions.includes("visitoring:workspace:read"),
            )
            .map((item) => item.scope.workspaceId)
            .filter((workspaceId): workspaceId is string => typeof workspaceId === "string"),
        ),
      ];
  if (!isOrganizationAdmin && workspaceIds.length === 0) return [];

  const activeWorkspaces = () =>
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        organizationId: workspaces.organizationId,
      })
      .from(workspaces);
  const accessibleWorkspaces = isOrganizationAdmin
    ? await activeWorkspaces()
        .where(
          and(
            eq(workspaces.organizationId, normalizedOrganizationId),
            isNull(workspaces.archivedAt),
            isNull(workspaces.deletionPendingAt),
          ),
        )
    : await activeWorkspaces()
        .where(
          and(
            inArray(workspaces.id, workspaceIds),
            eq(workspaces.organizationId, normalizedOrganizationId),
            isNull(workspaces.archivedAt),
            isNull(workspaces.deletionPendingAt),
          ),
        )
        .limit(workspaceIds.length);

  return accessibleWorkspaces
    .map((workspace) => {
      const role = visitoringRoleForWorkspace(organization, normalizedOrganizationId, workspace.id);
      return role ? { ...workspace, organizationName: organization.organizationName, role } : null;
    })
    .filter((workspace): workspace is VisitoringWorkspaceChoice => workspace !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function visitoringUserForWorkspace(
  auth: ConsumerSession,
  organizationId: string,
  workspaceId: string,
): Promise<VisitoringCurrentUser | null> {
  const normalizedOrganizationId = organizationId.trim().toLowerCase();
  const organization = auth.organizations.find(
    (item) =>
      item.organizationId.toLowerCase() === normalizedOrganizationId &&
      item.productId === configuration().productId,
  );
  if (!organization) return null;

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      organizationId: workspaces.organizationId,
    })
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.organizationId, normalizedOrganizationId),
        isNull(workspaces.archivedAt),
        isNull(workspaces.deletionPendingAt),
      ),
    )
    .limit(1);
  if (!workspace) return null;

  const role = visitoringRoleForWorkspace(organization, normalizedOrganizationId, workspace.id);
  if (!role) return null;

  return {
    id: auth.account.subjectId,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    organizationId: workspace.organizationId,
    organizationName: organization.organizationName,
    email: auth.account.email,
    role,
  };
}

export async function consumerWorkspaceScope(workspaceId: string) {
  const [workspace] = await db
    .select({ organizationId: workspaces.organizationId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new PerministerApiError(404, "Workspace not found.");
  return {
    organizationId: workspace.organizationId,
    scopeKind: "workspace",
    resourceId: workspaceId,
  };
}

export async function listPerministerWorkspaceMembers(
  workspaceId: string,
  knownOrganizationId?: string,
): Promise<VisitoringWorkspaceMember[]> {
  configuration();
  const scope = knownOrganizationId
    ? {
        organizationId: knownOrganizationId,
        scopeKind: "workspace",
        resourceId: workspaceId,
      }
    : await consumerWorkspaceScope(workspaceId);
  const params = new URLSearchParams(scope);
  const result = await requestPerminister<{ members: Array<Record<string, unknown>> }>(
    `/api/auth/consumer/members?${params.toString()}`,
  );
  if (!Array.isArray(result.members)) {
    throw new PerministerApiError(503, "Perminister returned an invalid member list.");
  }
  return result.members.map((member) => {
    if (
      typeof member.subjectId !== "string" ||
      (member.email !== null && typeof member.email !== "string") ||
      (member.role !== "admin" && member.role !== "viewer") ||
      typeof member.active !== "boolean"
    ) {
      throw new PerministerApiError(503, "Perminister returned an invalid member list.");
    }
    return {
      id: member.subjectId,
      email: member.email as string | null,
      role: member.role,
      isActive: member.active,
    };
  });
}
