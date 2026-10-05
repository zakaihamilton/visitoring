function normalizeDomain(input: string): string | null {
  const candidate = input.trim().toLowerCase();
  if (!candidate || candidate === "*") return null;
  try {
    const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      return null;
    if (parsed.hostname.includes("*") || parsed.hostname.length > 253) return null;
    return parsed.host.toLowerCase();
  } catch {
    return null;
  }
}

export function parseAllowedDomains(input: string): string[] {
  const domains = input
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(normalizeDomain);
  if (domains.some((domain) => domain === null))
    throw new Error("Enter valid domain names separated by commas.");
  return [...new Set(domains as string[])];
}

export function originIsAllowed(origin: string | null, allowedDomains: string[]): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.host.toLowerCase();
  return allowedDomains.some((allowed) => {
    const candidate = normalizeDomain(allowed);
    if (!candidate) return false;
    if (candidate === host) return true;
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      candidate === parsed.hostname
    );
  });
}
