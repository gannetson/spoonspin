import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  SESSION_COOKIE,
  authenticateUser,
  createSession,
  createUser,
  deleteSession,
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

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function registerAuthRoutes(app: import("express").Express): void {
  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const user = await getUserBySessionToken(token);
    res.json({ user });
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
