import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  appOrigin,
  clearOAuthCookies,
  finishGoogleOAuth,
  getAuthProviders,
  googleRedirectUri,
  isGoogleOAuthConfigured,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  oauthCookieOptions,
  safeNextPath,
  startGoogleOAuth,
} from "../auth/oauth.ts";
import {
  SESSION_COOKIE,
  authenticateUser,
  createSession,
  createUser,
  deleteSession,
  findOrCreateOAuthUser,
  getUserBySessionToken,
  type PublicUser,
} from "../db/users.ts";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).optional(),
});

export type AuthedRequest = Request & { user?: PublicUser };

export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = await getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ message: "Please sign in." });
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = await getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ message: "Please sign in." });
    return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ message: "Admin access required." });
    return;
  }
  req.user = user;
  next();
}

/** Editors and admins — recipe item tools (edit, images, remove, AI rewrite). */
export async function requireEditorOrAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = await getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ message: "Please sign in." });
    return;
  }
  if (user.role !== "admin" && user.role !== "editor") {
    res.status(403).json({ message: "Editor or admin access required." });
    return;
  }
  req.user = user;
  next();
}

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

function oauthErrorRedirect(req: Request, nextPath: string): string {
  const params = new URLSearchParams({ error: "oauth" });
  if (nextPath !== "/") params.set("next", nextPath);
  return `${appOrigin(req)}/login?${params.toString()}`;
}

export function registerAuthRoutes(app: import("express").Express): void {
  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const user = await getUserBySessionToken(token);
    res.json({ user });
  });

  app.get("/api/auth/providers", (_req, res) => {
    res.json(getAuthProviders());
  });

  app.get("/api/auth/google", (req, res) => {
    const nextPath = safeNextPath(
      typeof req.query.next === "string" ? req.query.next : null,
    );
    if (!isGoogleOAuthConfigured()) {
      res.redirect(oauthErrorRedirect(req, nextPath));
      return;
    }
    try {
      const { url, state, codeVerifier } = startGoogleOAuth(req);
      const cookieOpts = oauthCookieOptions();
      res.cookie(OAUTH_STATE_COOKIE, state, cookieOpts);
      res.cookie(OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOpts);
      res.cookie(OAUTH_NEXT_COOKIE, nextPath, cookieOpts);
      res.redirect(url.toString());
    } catch (error) {
      console.error("[auth] google start failed", error);
      res.redirect(oauthErrorRedirect(req, nextPath));
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const nextPath = safeNextPath(
      (req.cookies?.[OAUTH_NEXT_COOKIE] as string | undefined) ?? null,
    );
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as
      | string
      | undefined;
    const codeVerifier = req.cookies?.[OAUTH_VERIFIER_COOKIE] as
      | string
      | undefined;
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const code =
      typeof req.query.code === "string" ? req.query.code : undefined;
    const oauthError =
      typeof req.query.error === "string" ? req.query.error : undefined;

    clearOAuthCookies(res);

    if (oauthError || !code || !state || !expectedState || !codeVerifier) {
      console.warn("[auth] google callback rejected", {
        oauthError: oauthError ?? null,
        hasCode: Boolean(code),
        hasState: Boolean(state),
        hasExpectedState: Boolean(expectedState),
        hasCodeVerifier: Boolean(codeVerifier),
        origin: appOrigin(req),
        redirectUri: googleRedirectUri(req),
      });
      res.redirect(oauthErrorRedirect(req, nextPath));
      return;
    }
    if (state !== expectedState) {
      console.warn("[auth] google callback state mismatch", {
        origin: appOrigin(req),
      });
      res.redirect(oauthErrorRedirect(req, nextPath));
      return;
    }

    try {
      const profile = await finishGoogleOAuth({ code, codeVerifier }, req);
      if (!profile.emailVerified || !profile.email) {
        res.redirect(oauthErrorRedirect(req, nextPath));
        return;
      }
      const user = await findOrCreateOAuthUser({
        provider: "google",
        providerUserId: profile.providerUserId,
        email: profile.email,
        name: profile.name,
      });
      const session = await createSession(user.id);
      setSessionCookie(res, session.token, session.expiresAt);
      res.redirect(`${appOrigin(req)}${nextPath}`);
    } catch (error) {
      console.error("[auth] google callback failed", error);
      res.redirect(oauthErrorRedirect(req, nextPath));
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Enter a valid email and a password of at least 8 characters.",
      });
      return;
    }
    try {
      const user = await createUser(parsed.data);
      const session = await createSession(user.id);
      setSessionCookie(res, session.token, session.expiresAt);
      res.status(201).json({ user });
    } catch (error) {
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Could not create account.",
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = credentialsSchema
      .pick({ email: true, password: true })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter email and password." });
      return;
    }
    const user = await authenticateUser(
      parsed.data.email,
      parsed.data.password,
    );
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json({ user });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });
}
