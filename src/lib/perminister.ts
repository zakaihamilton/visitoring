import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

export const PERMINISTER_SESSION_COOKIE = "visitoring_session";
const VISITORING_PRODUCT_ID = "visitoring";

export type VisitoringRole = "admin" | "viewer";
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
  workspaceSlug: string;
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

export async function requestPerminister<T>(
  path: string,
  options: PerministerRequestOptions = {},
): Promise<T> {
  const config = configuration();
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

  let response: Response;
  try {
    response = await fetch(new URL(path, config.baseUrl), {
      method: options.method ?? "GET",
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PerministerApiError(503, "Perminister is temporarily unavailable.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok)
      throw new PerministerApiError(503, "Perminister returned an invalid response.");
  }
  if (!response.ok) {
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

export function readPerministerSession(token: string): Promise<ConsumerSession> {
  return requestPerminister<ConsumerSession>("/api/auth/consumer/session", { token });
}

export async function revokePerministerSession(token: string): Promise<void> {
  await requestPerminister<{ signedOut: boolean }>("/api/auth/consumer/session", {
    method: "DELETE",
    token,
  });
}

export async function visitoringUserForWorkspace(
  auth: ConsumerSession,
  workspaceSlug: string,
): Promise<VisitoringCurrentUser | null> {
  const config = configuration();
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      organizationId: workspaces.organizationId,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug.trim().toLowerCase()))
    .limit(1);
  if (!workspace) return null;

  const organization = auth.organizations.find(
    (item) =>
      item.organizationId.toLowerCase() === workspace.organizationId.toLowerCase() &&
      item.productId === config.productId,
  );
  const grant = organization?.resourceRoles.find(
    (item) =>
      item.scope.kind === "workspace" &&
      item.scope.organizationId?.toLowerCase() === workspace.organizationId.toLowerCase() &&
      item.scope.productId === config.productId &&
      item.scope.workspaceId === workspace.id &&
      (item.role === "admin" || item.role === "viewer") &&
      item.actions.includes("visitoring:workspace:read"),
  );
  if (!organization || !grant || (grant.role !== "admin" && grant.role !== "viewer")) return null;

  return {
    id: auth.account.subjectId,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    organizationId: workspace.organizationId,
    organizationName: organization.organizationName,
    email: auth.account.email,
    role: grant.role,
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
): Promise<VisitoringWorkspaceMember[]> {
  configuration();
  const params = new URLSearchParams(await consumerWorkspaceScope(workspaceId));
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
