const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const PRODUCTION_PUBLIC_ORIGIN = "https://billing.marketivity.agency";

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(env("GROK_PROJECT_ID"));
}

function parseOrigin(value: string, key: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be an absolute http(s) URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${key} must use http:// or https://`);
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${key} must contain only an origin, without credentials or a path`);
  }
  if (isProductionRuntime() && LOCALHOST_HOSTS.has(url.hostname)) {
    throw new Error(`${key} must not point to localhost in production`);
  }
  if (isProductionRuntime() && url.protocol !== "https:") {
    throw new Error(`${key} must use https:// in production`);
  }
  if (isProductionRuntime() && url.origin !== PRODUCTION_PUBLIC_ORIGIN) {
    throw new Error(`${key} must be ${PRODUCTION_PUBLIC_ORIGIN} in production`);
  }

  return url.origin;
}

/**
 * The configured public origin, or null only for the dynamic live preview.
 * Production never falls back to localhost or request-host inference.
 */
export function getConfiguredPublicOrigin(): string | null {
  const configured = env("BETTER_AUTH_URL");
  if (configured) return parseOrigin(configured, "BETTER_AUTH_URL");
  if (isProductionRuntime()) {
    throw new Error("BETTER_AUTH_URL is required in production");
  }
  return null;
}

/** Build an invitation URL from the same canonical origin used by auth. */
export function buildInvitationUrl(token: string): string | null {
  const origin = getConfiguredPublicOrigin();
  if (!origin) return null;
  const url = new URL("/invite", origin);
  url.searchParams.set("token", token);
  return url.toString();
}
