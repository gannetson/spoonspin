import { decodeIdToken, generateCodeVerifier, generateState, Google } from "arctic";
import type { Request } from "express";

const OAUTH_STATE_COOKIE = "spoonspin_oauth_state";
const OAUTH_VERIFIER_COOKIE = "spoonspin_oauth_verifier";
const OAUTH_NEXT_COOKIE = "spoonspin_oauth_next";

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin);
  }
}

function originFromRequest(req: Request): string | undefined {
  const hostHeader = (req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    ?.trim();
  if (!hostHeader) return undefined;

  const protoHeader = (req.get("x-forwarded-proto") || req.protocol || "http")
    .split(",")[0]
    ?.trim();
  const proto =
    protoHeader === "https" || protoHeader === "http"
      ? protoHeader
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http";

  return `${proto}://${hostHeader}`.replace(/\/$/, "");
}

/**
 * Public SPA/API origin for OAuth redirects.
 * Prefer APP_URL when set to a non-localhost value; otherwise derive from the
 * incoming request (nginx X-Forwarded-*). Never fall back to localhost in
 * production when a public Host is available.
 */
export function appOrigin(req?: Request): string {
  const configured = trimEnv("APP_URL")?.replace(/\/$/, "");
  if (configured && !isLocalOrigin(configured)) {
    return configured;
  }

  if (req) {
    const fromRequest = originFromRequest(req);
    if (fromRequest && !isLocalOrigin(fromRequest)) {
      return fromRequest;
    }
    if (fromRequest && process.env.NODE_ENV !== "production") {
      return fromRequest;
    }
  }

  if (configured) return configured;
  return "http://localhost:5173";
}

export function googleRedirectUri(req?: Request): string {
  const configured = trimEnv("GOOGLE_REDIRECT_URI");
  if (configured) return configured.replace(/\/$/, "");
  return `${appOrigin(req)}/api/auth/google/callback`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(trimEnv("GOOGLE_CLIENT_ID") && trimEnv("GOOGLE_CLIENT_SECRET"));
}

export function isAppleOAuthConfigured(): boolean {
  return Boolean(
    trimEnv("APPLE_CLIENT_ID") &&
    trimEnv("APPLE_TEAM_ID") &&
    trimEnv("APPLE_KEY_ID") &&
    trimEnv("APPLE_PRIVATE_KEY"),
  );
}

export function getAuthProviders(): { google: boolean; apple: boolean } {
  return {
    google: isGoogleOAuthConfigured(),
    apple: isAppleOAuthConfigured(),
  };
}

/** Warn when production OAuth would bounce users to localhost. */
export function warnIfOAuthMisconfigured(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (!isGoogleOAuthConfigured()) return;

  const appUrl = trimEnv("APP_URL");
  const redirect = trimEnv("GOOGLE_REDIRECT_URI") ?? googleRedirectUri();
  if (!appUrl || isLocalOrigin(appUrl)) {
    console.warn(
      "[auth] APP_URL is missing or localhost in production. Set APP_URL=https://spoonspin.nl (OAuth will use the request Host as a fallback).",
    );
  }
  if (isLocalOrigin(redirect)) {
    console.warn(
      `[auth] Google redirect URI looks local (${redirect}). Set APP_URL or GOOGLE_REDIRECT_URI to your public https origin, and add the same URI in Google Cloud Console.`,
    );
  }
}

function createGoogleClient(req?: Request): Google {
  const clientId = trimEnv("GOOGLE_CLIENT_ID");
  const clientSecret = trimEnv("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Google Sign-In is not configured.");
  }
  return new Google(clientId, clientSecret, googleRedirectUri(req));
}

export type OAuthStart = {
  url: URL;
  state: string;
  codeVerifier: string;
};

export function startGoogleOAuth(req?: Request): OAuthStart {
  const google = createGoogleClient(req);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);
  return { url, state, codeVerifier };
}

export type GoogleProfile = {
  providerUserId: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
};

export async function finishGoogleOAuth(
  input: {
    code: string;
    codeVerifier: string;
  },
  req?: Request,
): Promise<GoogleProfile> {
  const google = createGoogleClient(req);
  const tokens = await google.validateAuthorizationCode(input.code, input.codeVerifier);
  const idToken = tokens.idToken();
  if (!idToken) {
    throw new Error("Google did not return an ID token.");
  }
  const claims = decodeIdToken(idToken) as {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
  };
  const providerUserId = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!providerUserId) {
    throw new Error("Google ID token missing subject.");
  }
  const email = typeof claims.email === "string" ? claims.email.trim() : null;
  const name = typeof claims.name === "string" ? claims.name.trim() : null;
  const emailVerified =
    claims.email_verified === true || claims.email_verified === "true";
  return {
    providerUserId,
    email,
    name: name || null,
    emailVerified,
  };
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/** Express cookie `maxAge` is milliseconds. */
export function oauthCookieOptions(maxAgeMs = 10 * 60 * 1000) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function clearOAuthCookies(res: {
  clearCookie: (name: string, options?: { path?: string }) => void;
}): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
  res.clearCookie(OAUTH_VERIFIER_COOKIE, { path: "/" });
  res.clearCookie(OAUTH_NEXT_COOKIE, { path: "/" });
}

export { OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE };
