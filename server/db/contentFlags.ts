import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { TagEntityType } from "../../src/tags/types.ts";
import { ensureDb } from "./restaurants.ts";

export type ContentFlagStatus = "open" | "resolved" | "dismissed";

export type ContentFlag = {
  id: string;
  userId: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  reason: string;
  status: ContentFlagStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminContentFlag = ContentFlag & {
  reporterEmail: string | null;
  reporterName: string | null;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function rowToFlag(row: QueryResultRow): ContentFlag {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    entityType: row.entity_type as TagEntityType,
    entityId: String(row.entity_id),
    entityName: String(row.entity_name),
    countryCode: String(row.country_code).toLowerCase(),
    reason: String(row.reason),
    status: row.status as ContentFlagStatus,
    createdAt: toIso(row.created_at),
    resolvedAt: row.resolved_at == null ? null : toIso(row.resolved_at),
  };
}

function rowToAdminFlag(row: QueryResultRow): AdminContentFlag {
  return {
    ...rowToFlag(row),
    reporterEmail: row.reporter_email == null ? null : String(row.reporter_email),
    reporterName: row.reporter_name == null ? null : String(row.reporter_name),
  };
}

export async function createContentFlag(input: {
  userId: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  reason: string;
}): Promise<ContentFlag> {
  const db = await ensureDb();
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO content_flags (
       id, user_id, entity_type, entity_id, entity_name, country_code, reason, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
     RETURNING *`,
    [
      id,
      input.userId,
      input.entityType,
      input.entityId,
      input.entityName.trim(),
      input.countryCode.trim().toLowerCase(),
      input.reason.trim(),
    ],
  );
  return rowToFlag(result.rows[0]!);
}

export async function listContentFlags(filter: {
  status?: ContentFlagStatus | "all";
  limit?: number;
} = {}): Promise<AdminContentFlag[]> {
  const db = await ensureDb();
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (filter.status && filter.status !== "all") {
    params.push(filter.status);
    clauses.push(`f.status = $${params.length}`);
  }

  const limit = Math.min(Math.max(filter.limit ?? 200, 1), 500);
  params.push(limit);

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.query(
    `SELECT f.*,
            u.email AS reporter_email,
            u.name AS reporter_name
     FROM content_flags f
     LEFT JOIN users u ON u.id = f.user_id
     ${where}
     ORDER BY
       CASE f.status WHEN 'open' THEN 0 WHEN 'resolved' THEN 1 ELSE 2 END,
       f.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows.map(rowToAdminFlag);
}

export async function updateContentFlagStatus(
  id: string,
  status: ContentFlagStatus,
): Promise<AdminContentFlag | null> {
  const db = await ensureDb();
  const result = await db.query(
    `UPDATE content_flags
     SET status = $2,
         resolved_at = CASE
           WHEN $2 = 'open' THEN NULL
           ELSE COALESCE(resolved_at, NOW())
         END
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );
  const updated = result.rows[0];
  if (!updated) return null;

  const joined = await db.query(
    `SELECT f.*,
            u.email AS reporter_email,
            u.name AS reporter_name
     FROM content_flags f
     LEFT JOIN users u ON u.id = f.user_id
     WHERE f.id = $1`,
    [id],
  );
  const row = joined.rows[0];
  return row ? rowToAdminFlag(row) : {
    ...rowToFlag(updated),
    reporterEmail: null,
    reporterName: null,
  };
}
