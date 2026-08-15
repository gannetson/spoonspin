import { getDb } from "./restaurants.ts";

export const FILL_PROGRESS_ID = "default";

export type ContentFillProgressPayload = {
  version: 2;
  orderCompletedIds: string[];
  orderFailedIds: string[];
  lastRunAt: string | null;
  lastOrdersRunAt: string | null;
  lastCookRunAt: string | null;
  lastRestaurantsRunAt: string | null;
  cookCompletedCodes: string[];
  cookFailedCodes: string[];
  gatherCompletedJobIds: string[];
  totals: {
    runs: number;
    orderOptionsAdded: number;
    orderJobsDone: number;
    restaurantsHarvested: number;
    restaurantsPromoted: number;
    cookMenusCompleted: number;
  };
};

export function defaultFillProgress(): ContentFillProgressPayload {
  return {
    version: 2,
    orderCompletedIds: [],
    orderFailedIds: [],
    lastRunAt: null,
    lastOrdersRunAt: null,
    lastCookRunAt: null,
    lastRestaurantsRunAt: null,
    cookCompletedCodes: [],
    cookFailedCodes: [],
    gatherCompletedJobIds: [],
    totals: {
      runs: 0,
      orderOptionsAdded: 0,
      orderJobsDone: 0,
      restaurantsHarvested: 0,
      restaurantsPromoted: 0,
      cookMenusCompleted: 0,
    },
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Normalize file v1 or DB payloads into the shared v2 shape. */
export function normalizeFillProgress(
  raw: unknown,
): ContentFillProgressPayload {
  const base = defaultFillProgress();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Record<string, unknown>;
  const totals =
    p.totals && typeof p.totals === "object"
      ? (p.totals as Record<string, unknown>)
      : {};
  return {
    version: 2,
    orderCompletedIds: asStringArray(p.orderCompletedIds),
    orderFailedIds: asStringArray(p.orderFailedIds),
    lastRunAt: typeof p.lastRunAt === "string" ? p.lastRunAt : null,
    lastOrdersRunAt:
      typeof p.lastOrdersRunAt === "string" ? p.lastOrdersRunAt : null,
    lastCookRunAt: typeof p.lastCookRunAt === "string" ? p.lastCookRunAt : null,
    lastRestaurantsRunAt:
      typeof p.lastRestaurantsRunAt === "string"
        ? p.lastRestaurantsRunAt
        : null,
    cookCompletedCodes: asStringArray(p.cookCompletedCodes),
    cookFailedCodes: asStringArray(p.cookFailedCodes),
    gatherCompletedJobIds: asStringArray(p.gatherCompletedJobIds),
    totals: {
      runs: Number(totals.runs ?? 0) || 0,
      orderOptionsAdded: Number(totals.orderOptionsAdded ?? 0) || 0,
      orderJobsDone: Number(totals.orderJobsDone ?? 0) || 0,
      restaurantsHarvested: Number(totals.restaurantsHarvested ?? 0) || 0,
      restaurantsPromoted: Number(totals.restaurantsPromoted ?? 0) || 0,
      cookMenusCompleted: Number(totals.cookMenusCompleted ?? 0) || 0,
    },
  };
}

export async function loadFillProgress(
  id: string = FILL_PROGRESS_ID,
): Promise<ContentFillProgressPayload> {
  const db = await getDb();
  const result = await db.query<{ payload: unknown }>(
    `SELECT payload FROM content_fill_progress WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return defaultFillProgress();
  return normalizeFillProgress(row.payload);
}

export async function saveFillProgress(
  payload: ContentFillProgressPayload,
  id: string = FILL_PROGRESS_ID,
): Promise<void> {
  const db = await getDb();
  const normalized = normalizeFillProgress(payload);
  await db.query(
    `
    INSERT INTO content_fill_progress (id, payload, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
    `,
    [id, JSON.stringify(normalized)],
  );
}

/** Merge lane-specific fields into the shared Postgres progress row. */
export async function mergeFillProgress(
  patch: Partial<ContentFillProgressPayload> & {
    totals?: Partial<ContentFillProgressPayload["totals"]>;
  },
  id: string = FILL_PROGRESS_ID,
): Promise<ContentFillProgressPayload> {
  const current = await loadFillProgress(id);
  const next: ContentFillProgressPayload = {
    ...current,
    ...patch,
    version: 2,
    totals: {
      ...current.totals,
      ...(patch.totals ?? {}),
    },
  };
  await saveFillProgress(next, id);
  return next;
}
