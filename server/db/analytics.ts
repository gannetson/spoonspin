import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { ensureDb } from "./restaurants.ts";

export const PRODUCT_EVENT_TYPES = [
  "country_view",
  "restaurant_search",
  "restaurant_view",
  "suggestion_preview",
  "suggestion_create",
  "auth_login_success",
  "auth_login_failure",
] as const;

export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

export type ReportRange = "24h" | "7d" | "30d";

const RETENTION_DAYS = 30;
const UA_MAX = 200;
const TOP_N = 15;

let lastPruneAt = 0;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;

export function normalizeApiPath(rawPath: string): string {
  const withoutQuery = rawPath.split("?")[0] ?? rawPath;
  const parts = withoutQuery.split("/").map((segment) => {
    if (!segment) return segment;
    if (UUID_RE.test(segment) || NUMERIC_RE.test(segment)) return ":id";
    return segment;
  });
  return parts.join("/") || "/";
}

export function shouldSkipAccessLog(path: string): boolean {
  const normalized = normalizeApiPath(path);
  return (
    normalized === "/api/health" ||
    normalized === "/api/content/status" ||
    normalized === "/api/suggestions/status" ||
    normalized === "/api/admin/reports" ||
    normalized.startsWith("/api/admin/reports/")
  );
}

function truncateUa(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > UA_MAX ? trimmed.slice(0, UA_MAX) : trimmed;
}

function clientIp(ip: string | undefined): string {
  const value = (ip ?? "").trim();
  return value || "unknown";
}

export async function pruneAnalyticsOlderThan(
  days = RETENTION_DAYS,
): Promise<void> {
  const db = await ensureDb();
  await db.query(
    `DELETE FROM api_request_logs WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [String(days)],
  );
  await db.query(
    `DELETE FROM product_events WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [String(days)],
  );
}

async function maybePrune(): Promise<void> {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  try {
    await pruneAnalyticsOlderThan();
  } catch (error) {
    console.error("[analytics] prune failed", error);
  }
}

export type ApiRequestLogInput = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
  userId?: string | null;
};

export function insertApiRequestLog(input: ApiRequestLogInput): void {
  const path = normalizeApiPath(input.path);
  if (shouldSkipAccessLog(path)) return;

  void (async () => {
    try {
      const db = await ensureDb();
      await db.query(
        `INSERT INTO api_request_logs
          (id, method, path, status, duration_ms, ip, user_agent, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          input.method.toUpperCase().slice(0, 16),
          path.slice(0, 512),
          input.status,
          Math.max(0, Math.round(input.durationMs)),
          clientIp(input.ip).slice(0, 128),
          truncateUa(input.userAgent),
          input.userId ?? null,
        ],
      );
      await maybePrune();
    } catch (error) {
      console.error("[analytics] request log insert failed", error);
    }
  })();
}

export type ProductEventInput = {
  eventType: ProductEventType;
  ip?: string;
  userId?: string | null;
  meta?: Record<string, unknown>;
};

export function recordProductEvent(input: ProductEventInput): void {
  void (async () => {
    try {
      const db = await ensureDb();
      await db.query(
        `INSERT INTO product_events (id, event_type, ip, user_id, meta)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          randomUUID(),
          input.eventType,
          clientIp(input.ip).slice(0, 128),
          input.userId ?? null,
          JSON.stringify(input.meta ?? {}),
        ],
      );
      await maybePrune();
    } catch (error) {
      console.error("[analytics] product event insert failed", error);
    }
  })();
}

function rangeInterval(range: ReportRange): {
  interval: string;
  trunc: "hour" | "day";
} {
  if (range === "24h") return { interval: "24 hours", trunc: "hour" };
  if (range === "30d") return { interval: "30 days", trunc: "day" };
  return { interval: "7 days", trunc: "day" };
}

export type AdminReportsResponse = {
  range: ReportRange;
  totals: {
    requests: number;
    errors: number;
    uniqueIps: number;
    countryViews: number;
    restaurantSearches: number;
  };
  series: Array<{
    bucket: string;
    requests: number;
    errors: number;
  }>;
  topIps: Array<{ ip: string; count: number; lastSeen: string }>;
  topPaths: Array<{ path: string; count: number }>;
  statusBreakdown: {
    "2xx": number;
    "4xx": number;
    "5xx": number;
    other: number;
  };
  product: {
    totals: Record<string, number>;
    series: {
      country_view: Array<{ bucket: string; count: number }>;
      restaurant_search: Array<{ bucket: string; count: number }>;
    };
  };
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getAdminReports(
  range: ReportRange = "7d",
): Promise<AdminReportsResponse> {
  await maybePrune();
  const db = await ensureDb();
  const { interval, trunc } = rangeInterval(range);
  const sinceSql = `NOW() - $1::interval`;

  const [
    totalsRow,
    seriesRows,
    topIpRows,
    topPathRows,
    statusRows,
    productTotalRows,
    countrySeriesRows,
    searchSeriesRows,
  ] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int AS requests,
         COUNT(*) FILTER (WHERE status >= 400)::int AS errors,
         COUNT(DISTINCT ip)::int AS unique_ips
       FROM api_request_logs
       WHERE created_at >= ${sinceSql}`,
      [interval],
    ),
    db.query(
      `SELECT
         date_trunc($2, created_at) AS bucket,
         COUNT(*)::int AS requests,
         COUNT(*) FILTER (WHERE status >= 400)::int AS errors
       FROM api_request_logs
       WHERE created_at >= ${sinceSql}
       GROUP BY 1
       ORDER BY 1`,
      [interval, trunc],
    ),
    db.query(
      `SELECT
         ip,
         COUNT(*)::int AS count,
         MAX(created_at) AS last_seen
       FROM api_request_logs
       WHERE created_at >= ${sinceSql}
       GROUP BY ip
       ORDER BY count DESC
       LIMIT $2`,
      [interval, TOP_N],
    ),
    db.query(
      `SELECT path, COUNT(*)::int AS count
       FROM api_request_logs
       WHERE created_at >= ${sinceSql}
       GROUP BY path
       ORDER BY count DESC
       LIMIT $2`,
      [interval, TOP_N],
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status >= 200 AND status < 300)::int AS s2,
         COUNT(*) FILTER (WHERE status >= 400 AND status < 500)::int AS s4,
         COUNT(*) FILTER (WHERE status >= 500 AND status < 600)::int AS s5,
         COUNT(*) FILTER (
           WHERE status < 200 OR (status >= 300 AND status < 400) OR status >= 600
         )::int AS other
       FROM api_request_logs
       WHERE created_at >= ${sinceSql}`,
      [interval],
    ),
    db.query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM product_events
       WHERE created_at >= ${sinceSql}
       GROUP BY event_type`,
      [interval],
    ),
    db.query(
      `SELECT date_trunc($2, created_at) AS bucket, COUNT(*)::int AS count
       FROM product_events
       WHERE created_at >= ${sinceSql}
         AND event_type = 'country_view'
       GROUP BY 1
       ORDER BY 1`,
      [interval, trunc],
    ),
    db.query(
      `SELECT date_trunc($2, created_at) AS bucket, COUNT(*)::int AS count
       FROM product_events
       WHERE created_at >= ${sinceSql}
         AND event_type = 'restaurant_search'
       GROUP BY 1
       ORDER BY 1`,
      [interval, trunc],
    ),
  ]);

  const totals = totalsRow.rows[0] as QueryResultRow | undefined;
  const status = statusRows.rows[0] as QueryResultRow | undefined;

  const productTotals: Record<string, number> = {};
  for (const row of productTotalRows.rows) {
    productTotals[String(row.event_type)] = num(row.count);
  }

  return {
    range,
    totals: {
      requests: num(totals?.requests),
      errors: num(totals?.errors),
      uniqueIps: num(totals?.unique_ips),
      countryViews: productTotals.country_view ?? 0,
      restaurantSearches: productTotals.restaurant_search ?? 0,
    },
    series: seriesRows.rows.map((row) => ({
      bucket: toIso(row.bucket),
      requests: num(row.requests),
      errors: num(row.errors),
    })),
    topIps: topIpRows.rows.map((row) => ({
      ip: String(row.ip),
      count: num(row.count),
      lastSeen: toIso(row.last_seen),
    })),
    topPaths: topPathRows.rows.map((row) => ({
      path: String(row.path),
      count: num(row.count),
    })),
    statusBreakdown: {
      "2xx": num(status?.s2),
      "4xx": num(status?.s4),
      "5xx": num(status?.s5),
      other: num(status?.other),
    },
    product: {
      totals: productTotals,
      series: {
        country_view: countrySeriesRows.rows.map((row) => ({
          bucket: toIso(row.bucket),
          count: num(row.count),
        })),
        restaurant_search: searchSeriesRows.rows.map((row) => ({
          bucket: toIso(row.bucket),
          count: num(row.count),
        })),
      },
    },
  };
}
