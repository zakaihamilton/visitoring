import "server-only";

export function perministerBaseUrl(): URL {
  const baseUrl = process.env.PERMINISTER_BASE_URL?.trim() || "https://www.perminister.com";
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
  return origin;
}

export function perministerRecoveryUrl(): string | null {
  try {
    return new URL("/forgot-password", perministerBaseUrl()).toString();
  } catch {
    return null;
  }
}
