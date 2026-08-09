import {
  decodeIdToken,
  generateCodeVerifier,
  generateState,
  Google,
} from "arctic";

const OAUTH_STATE_COOKIE = "spoonspin_oauth_state";
const OAUTH_VERIFIER_COOKIE = "spoonspin_oauth_verifier";
const OAUTH_NEXT_COOKIE = "spoonspin_oauth_next";

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function appOrigin(): string {
  return (trimEnv("APP_URL") ?? "http://localhost:5173").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return (
    trimEnv("GOOGLE_REDIRECT_URI") ??
    `${appOrigin()}/api/auth/google/callback`
  );
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

function createGoogleClient(): Google {
  const clientId = trimEnv("GOOGLE_CLIENT_ID");
  const clientSecret = trimEnv("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Google Sign-In is not configured.");
  }
  return new Google(clientId, clientSecret, googleRedirectUri());
}

export type OAuthStart = {
  url: URL;
  state: string;
  codeVerifier: string;
};

export function startGoogleOAuth(): OAuthStart {
  const google = createGoogleClient();
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

export async function finishGoogleOAuth(input: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleProfile> {
  const google = createGoogleClient();
  const tokens = await google.validateAuthorizationCode(
    input.code,
    input.codeVerifier,
  );
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
  const providerUserId =
    typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!providerUserId) {
    throw new Error("Google ID token missing subject.");
  }
  const email =
    typeof claims.email === "string" ? claims.email.trim() : null;
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

export {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_NEXT_COOKIE,
};
