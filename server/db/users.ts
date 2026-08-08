import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { QueryResultRow } from "pg";
import { ensureDb } from "./restaurants.ts";

const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

export const USER_ROLES = ["member", "editor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
};

export type SessionUser = PublicUser;

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function parseRole(value: unknown): UserRole {
  if (value === "editor" || value === "admin" || value === "member") {
    return value;
  }
  return "member";
}

function rowToUser(row: QueryResultRow): PublicUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name == null ? null : String(row.name),
    role: parseRole(row.role),
    createdAt: toIso(row.created_at),
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@") || email.length < 5) {
    throw new Error("Enter a valid email address.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const db = await ensureDb();
  const existing = await db.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [
    email,
  ]);
  if (existing.rows[0]) {
    throw new Error("An account with this email already exists.");
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, name, role, created_at)
     VALUES ($1, $2, $3, $4, 'member', NOW())
     RETURNING id, email, name, role, created_at`,
    [id, email, passwordHash, input.name?.trim() || null],
  );
  return rowToUser(result.rows[0]!);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, email, name, role, created_at, password_hash
     FROM users WHERE LOWER(email) = $1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  if (!row) return null;
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) return null;
  return rowToUser(row);
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const db = await ensureDb();
  const token = createHash("sha256")
    .update(randomBytes(48))
    .digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await db.query(
    `INSERT INTO sessions (token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [token, userId, expiresAt.toISOString()],
  );
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await ensureDb();
  await db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function getUserBySessionToken(
  token: string | undefined | null,
): Promise<PublicUser | null> {
  if (!token) return null;
  const db = await ensureDb();
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

export async function cleanupExpiredSessions(): Promise<void> {
  const db = await ensureDb();
  await db.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
}

export const SESSION_COOKIE = "spoonspin_session";
