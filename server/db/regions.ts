import type { Pool, QueryResultRow } from "pg";
import { ensureDb } from "./restaurants.ts";

export type Region = {
  id: string;
  countryCode: string;
  name: string;
};

/** Provincial-level divisions of China (English names). */
export const CHINESE_REGIONS = [
  "Anhui",
  "Beijing",
  "Chongqing",
  "Fujian",
  "Gansu",
  "Guangdong",
  "Guangxi",
  "Guizhou",
  "Hainan",
  "Hebei",
  "Heilongjiang",
  "Henan",
  "Hong Kong",
  "Hubei",
  "Hunan",
  "Inner Mongolia",
  "Jiangsu",
  "Jiangxi",
  "Jilin",
  "Liaoning",
  "Macau",
  "Ningxia",
  "Qinghai",
  "Shaanxi",
  "Shandong",
  "Shanghai",
  "Shanxi",
  "Sichuan",
  "Tianjin",
  "Tibet",
  "Xinjiang",
  "Yunnan",
  "Zhejiang",
] as const;

/** Maps normalized alias → canonical English region name. */
const REGION_ALIASES: Record<string, string> = {
  // Sichuan variants
  szechuan: "Sichuan",
  szechwan: "Sichuan",
  sichuan: "Sichuan",
  "sichuan province": "Sichuan",
  // Guangxi
  guangxi: "Guangxi",
  "guangxi zhuang": "Guangxi",
  "guangxi zhuang autonomous region": "Guangxi",
  // Inner Mongolia
  "inner mongolia": "Inner Mongolia",
  "inner mongol": "Inner Mongolia",
  neimenggu: "Inner Mongolia",
  // Tibet
  tibet: "Tibet",
  xizang: "Tibet",
  "tibet autonomous region": "Tibet",
  // Xinjiang
  xinjiang: "Xinjiang",
  "xinjiang uygur": "Xinjiang",
  "xinjiang uighur": "Xinjiang",
  // Ningxia
  ningxia: "Ningxia",
  "ningxia hui": "Ningxia",
  // Hong Kong / Macau
  "hong kong": "Hong Kong",
  hk: "Hong Kong",
  hksar: "Hong Kong",
  macau: "Macau",
  macao: "Macau",
  // Municipalities & provinces (lowercase keys)
  anhui: "Anhui",
  beijing: "Beijing",
  peking: "Beijing",
  chongqing: "Chongqing",
  chungking: "Chongqing",
  fujian: "Fujian",
  fukien: "Fujian",
  gansu: "Gansu",
  guangdong: "Guangdong",
  canton: "Guangdong",
  guizhou: "Guizhou",
  kweichow: "Guizhou",
  hainan: "Hainan",
  hebei: "Hebei",
  heilongjiang: "Heilongjiang",
  henan: "Henan",
  honan: "Henan",
  hubei: "Hubei",
  hunan: "Hunan",
  jiangsu: "Jiangsu",
  kiangsu: "Jiangsu",
  jiangxi: "Jiangxi",
  jilin: "Jilin",
  kirin: "Jilin",
  liaoning: "Liaoning",
  qinghai: "Qinghai",
  shaanxi: "Shaanxi",
  shensi: "Shaanxi",
  shandong: "Shandong",
  shanghai: "Shanghai",
  shanxi: "Shanxi",
  shansi: "Shanxi",
  tianjin: "Tianjin",
  tientsin: "Tianjin",
  yunnan: "Yunnan",
  zhejiang: "Zhejiang",
  chekiang: "Zhejiang",
};

export function normalizeRegionName(raw: string): string {
  return raw
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveCanonicalRegionName(raw: string): string {
  const normalized = normalizeRegionName(raw);
  if (!normalized) return raw.trim();
  const alias = REGION_ALIASES[normalized];
  if (alias) return alias;
  return titleCaseWords(raw.trim());
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function regionSlug(countryCode: string, canonicalName: string): string {
  const base = canonicalName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${countryCode.toLowerCase()}:${base || "region"}`;
}

function rowToRegion(row: QueryResultRow): Region {
  return {
    id: String(row.id),
    countryCode: String(row.country_code).toLowerCase(),
    name: String(row.name),
  };
}

export async function seedChineseRegions(db?: Pool): Promise<number> {
  const pool = db ?? (await ensureDb());
  let inserted = 0;
  for (const name of CHINESE_REGIONS) {
    const id = regionSlug("cn", name);
    const normalized = normalizeRegionName(name);
    const result = await pool.query(
      `INSERT INTO regions (id, country_code, name, normalized_name)
       VALUES ($1, 'cn', $2, $3)
       ON CONFLICT (country_code, normalized_name) DO NOTHING`,
      [id, name, normalized],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

export async function listRegionsForCountry(countryCode: string): Promise<Region[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, country_code, name
     FROM regions
     WHERE country_code = $1
     ORDER BY name ASC`,
    [countryCode.toLowerCase()],
  );
  return result.rows.map(rowToRegion);
}

export async function getRegionById(id: string): Promise<Region | undefined> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, country_code, name FROM regions WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? rowToRegion(row) : undefined;
}

export async function findRegionByNormalizedName(
  countryCode: string,
  normalizedName: string,
): Promise<Region | undefined> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, country_code, name
     FROM regions
     WHERE country_code = $1 AND normalized_name = $2`,
    [countryCode.toLowerCase(), normalizedName],
  );
  const row = result.rows[0];
  return row ? rowToRegion(row) : undefined;
}

export type RegionResolver = {
  resolve(
    rawName: string | undefined | null,
    fallbackRegionId?: string | null,
  ): Promise<Region | undefined>;
};

/** Batch-friendly region lookup — one list query, cached creates. */
export async function createRegionResolver(countryCode: string): Promise<RegionResolver> {
  const code = countryCode.toLowerCase();
  const all = await listRegionsForCountry(code);
  const byNormalized = new Map<string, Region>();
  const byId = new Map<string, Region>();
  for (const region of all) {
    byNormalized.set(normalizeRegionName(region.name), region);
    byId.set(region.id, region);
  }

  async function resolve(
    rawName: string | undefined | null,
    fallbackRegionId?: string | null,
  ): Promise<Region | undefined> {
    const trimmed = rawName?.trim();
    if (!trimmed) {
      if (fallbackRegionId) return byId.get(fallbackRegionId);
      return undefined;
    }

    const canonical = resolveCanonicalRegionName(trimmed);
    const normalized = normalizeRegionName(canonical);
    const cached = byNormalized.get(normalized);
    if (cached) return cached;

    const id = regionSlug(code, canonical);
    const db = await ensureDb();
    const result = await db.query(
      `INSERT INTO regions (id, country_code, name, normalized_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (country_code, normalized_name) DO UPDATE
         SET name = EXCLUDED.name
       RETURNING id, country_code, name`,
      [id, code, canonical, normalized],
    );
    const row = result.rows[0];
    if (!row) {
      return findRegionByNormalizedName(code, normalized);
    }
    const region = rowToRegion(row);
    byNormalized.set(normalized, region);
    byId.set(region.id, region);
    all.push(region);
    return region;
  }

  return { resolve };
}

/**
 * Resolve a free-text region name to an existing row or create one.
 * Returns undefined when the input is empty.
 */
export async function findOrCreateRegion(
  countryCode: string,
  rawName: string | undefined | null,
): Promise<Region | undefined> {
  if (!rawName?.trim()) return undefined;
  const { resolve } = await createRegionResolver(countryCode);
  return resolve(rawName);
}
