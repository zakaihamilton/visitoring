import "server-only";
import { cookies } from "next/headers";
import { exchangePerministerOidcCode } from "./perminister-oidc";
import { perministerBaseUrl } from "./perminister-origin";

export const PERMINISTER_SESSION_COOKIE = "visitoring_session";
export const VISITORING_PRODUCT_ID = "visitoring";

export type VisitoringRole = "admin" | "viewer";
export type VisitoringOrganizationRole = "owner" | "admin" | "member";

export type ResourceRole = {
  scope: {
    kind: string;
    organizationId?: string;
    productId?: string;
    projectId?: string;
    workspaceId?: string;
  };
  role: string | null;
  actions: string[];
};

export type ConsumerOrganization = {
  organizationId: string;
  organizationName: string;
  organizationRole: VisitoringOrganizationRole;
  productId: string;
  resourceRoles: ResourceRole[];
};

export type ConsumerSession = {
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
  if (pathname.includes("/consumer/projects") || pathname.includes("/consumer/workspaces")) {
    return "project_grants";
  }
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

export function perministerConfiguration() {
  const clientId = process.env.PERMINISTER_APP_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.PERMINISTER_APP_CLIENT_SECRET?.trim() ?? "";
  const productId =
    process.env.PERMINISTER_PRODUCT_ID?.trim().toLowerCase() || VISITORING_PRODUCT_ID;
  const origin = perministerBaseUrl();
  if (!clientId || !clientSecret) {
    throw new Error("Perminister app client settings are required.");
  }
  if (productId !== VISITORING_PRODUCT_ID) {
    throw new Error(`PERMINISTER_PRODUCT_ID must be ${VISITORING_PRODUCT_ID}.`);
  }
  return { baseUrl: origin, clientId, clientSecret, productId };
}

export function perministerClientSecretForSso(): string {
  return perministerConfiguration().clientSecret;
}

export function perministerAuthorizationUrl(
  state: string,
  challenge: string,
  nonce: string,
  appOrigin: string,
  prompt?: "login",
): string {
  const config = perministerConfiguration();
  const redirectUri = new URL("/auth/perminister/callback", appOrigin);
  const url = new URL("/oauth/authorize", config.baseUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri.toString(),
    response_type: "code",
    scope: "openid profile email perminister_api",
    state,
    nonce,
    ...(prompt ? { prompt } : {}),
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function requestPerminister<T>(
  path: string,
  options: PerministerRequestOptions = {},
): Promise<T> {
  const config = perministerConfiguration();
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

export function exchangePerministerAuthorizationCode(
  code: string,
  codeVerifier: string,
  nonce: string,
  redirectUri: string,
): Promise<ConsumerLogin> {
  const config = perministerConfiguration();
  return exchangePerministerOidcCode({
    baseUrl: config.baseUrl.toString(),
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    code,
    codeVerifier,
    nonce,
    redirectUri,
  }).then(async ({ accessToken }) => {
    const session = await readPerministerSession(accessToken);
    if (!session.authenticated) throw new PerministerApiError(401, "Please sign in again.");
    return { ...session, sessionToken: accessToken };
  });
}

export function readPerministerSession(
  token: string,
  selectedOrganizationId?: string,
): Promise<ConsumerSession> {
  const sessionPath = selectedOrganizationId
    ? `/api/auth/consumer/session?${new URLSearchParams({
        organization_id: selectedOrganizationId,
      })}`
    : "/api/auth/consumer/session";
  return requestPerminister<ConsumerSession>(sessionPath, { token });
}

export async function revokePerministerSession(token: string): Promise<void> {
  await requestPerminister<{ signedOut: boolean }>("/api/auth/consumer/session", {
    method: "DELETE",
    token,
  });
}
