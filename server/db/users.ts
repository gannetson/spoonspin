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
  if (row.password_hash == null) return null;
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) return null;
  return rowToUser(row);
}

export type OAuthProvider = "google" | "apple";

export async function findOrCreateOAuthUser(input: {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  name?: string | null;
}): Promise<PublicUser> {
  const providerUserId = input.providerUserId.trim();
  if (!providerUserId) {
    throw new Error("Missing provider user id.");
  }

  const db = await ensureDb();

  const linked = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.created_at
     FROM oauth_accounts o
     JOIN users u ON u.id = o.user_id
     WHERE o.provider = $1 AND o.provider_user_id = $2`,
    [input.provider, providerUserId],
  );
  if (linked.rows[0]) {
    return rowToUser(linked.rows[0]);
  }

  const email = input.email ? normalizeEmail(input.email) : null;
  if (!email || !email.includes("@") || email.length < 5) {
    throw new Error(
      "This sign-in did not provide an email address. Try another method.",
    );
  }

  const existing = await db.query(
    `SELECT id, email, name, role, created_at
     FROM users WHERE LOWER(email) = $1`,
    [email],
  );
  let user: PublicUser;
  if (existing.rows[0]) {
    user = rowToUser(existing.rows[0]);
    if (input.name?.trim() && !user.name) {
      const updated = await db.query(
        `UPDATE users SET name = $1 WHERE id = $2
         RETURNING id, email, name, role, created_at`,
        [input.name.trim(), user.id],
      );
      user = rowToUser(updated.rows[0]!);
    }
  } else {
    const id = randomUUID();
    const created = await db.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at)
       VALUES ($1, $2, NULL, $3, 'member', NOW())
       RETURNING id, email, name, role, created_at`,
      [id, email, input.name?.trim() || null],
    );
    user = rowToUser(created.rows[0]!);
  }

  await db.query(
    `INSERT INTO oauth_accounts (provider, provider_user_id, user_id, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (provider, provider_user_id) DO NOTHING`,
    [input.provider, providerUserId, user.id],
  );

  return user;
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
  await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [
    userId,
  ]);
  return { token, expiresAt };
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
};

function rowToAdminUser(row: QueryResultRow): AdminUserRow {
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name == null ? null : String(row.name),
    role: parseRole(row.role),
    createdAt: toIso(row.created_at),
    lastLoginAt: row.last_login_at == null ? null : toIso(row.last_login_at),
  };
}

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, email, name, role, created_at, last_login_at
     FROM users
     ORDER BY created_at DESC`,
  );
  return result.rows.map(rowToAdminUser);
}

export async function getAdminUserById(
  userId: string,
): Promise<AdminUserRow | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, email, name, role, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row ? rowToAdminUser(row) : null;
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  actorUserId: string,
): Promise<AdminUserRow> {
  if (!USER_ROLES.includes(role)) {
    throw new Error("Invalid role.");
  }
  const db = await ensureDb();
  const existing = await db.query(
    `SELECT id, email, name, role, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const row = existing.rows[0];
  if (!row) {
    throw new Error("User not found.");
  }
  const currentRole = parseRole(row.role);
  if (currentRole === role) {
    return rowToAdminUser(row);
  }
  if (userId === actorUserId && role !== "admin") {
    throw new Error("You cannot remove your own admin role.");
  }
  if (currentRole === "admin" && role !== "admin") {
    const admins = await db.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'`,
    );
    const count = Number(admins.rows[0]?.count ?? 0);
    if (count <= 1) {
      throw new Error("Cannot demote the last admin.");
    }
  }
  const updated = await db.query(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, email, name, role, created_at, last_login_at`,
    [role, userId],
  );
  return rowToAdminUser(updated.rows[0]!);
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
