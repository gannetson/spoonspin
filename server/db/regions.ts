import type { Pool, QueryResultRow } from "pg";
import { ensureDb } from "./restaurants.ts";
import {
  loadCountryCatalog,
  lookupIsoCode,
  normalizeRegionName,
  regionIdFor,
  regionIdFromIso,
  regionSlug,
  resolveCanonicalRegionName,
} from "./regions/catalog.ts";

export type Region = {
  id: string;
  countryCode: string;
  name: string;
  isoCode?: string;
};

export {
  loadCountryCatalog,
  lookupIsoCode,
  normalizeRegionName,
  regionIdFor,
  regionIdFromIso,
  regionSlug,
  resolveCanonicalRegionName,
};

function rowToRegion(row: QueryResultRow): Region {
  return {
    id: String(row.id),
    countryCode: String(row.country_code).toLowerCase(),
    name: String(row.name),
    isoCode: row.iso_code == null ? undefined : String(row.iso_code),
  };
}

/** Seed ISO 3166-2 subdivisions for a country when catalog JSON exists. */
export async function seedCountryRegions(countryCode: string, db?: Pool): Promise<number> {
  const catalog = loadCountryCatalog(countryCode);
  if (!catalog) return 0;

  const code = countryCode.toLowerCase();
  const pool = db ?? (await ensureDb());
  let inserted = 0;

  for (const entry of catalog.subdivisions) {
    const id = regionIdFromIso(code, entry.isoCode);
    const normalized = normalizeRegionName(entry.name);
    const result = await pool.query(
      `INSERT INTO regions (id, country_code, name, normalized_name, iso_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         normalized_name = EXCLUDED.normalized_name,
         iso_code = EXCLUDED.iso_code
       RETURNING (xmax = 0) AS inserted`,
      [id, code, entry.name, normalized, entry.isoCode],
    );
    if (result.rows[0]?.inserted) inserted += 1;
  }

  return inserted;
}

export async function listRegionsForCountry(countryCode: string): Promise<Region[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, country_code, name, iso_code
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
    `SELECT id, country_code, name, iso_code FROM regions WHERE id = $1`,
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
    `SELECT id, country_code, name, iso_code
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

    const canonical = resolveCanonicalRegionName(trimmed, code);
    const isoCode = lookupIsoCode(code, canonical);
    const normalized = normalizeRegionName(canonical);
    const cached = byNormalized.get(normalized);
    if (cached) return cached;

    const id = regionIdFor(code, canonical, isoCode);
    const db = await ensureDb();
    const result = await db.query(
      `INSERT INTO regions (id, country_code, name, normalized_name, iso_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (country_code, normalized_name) DO UPDATE
         SET name = EXCLUDED.name,
             iso_code = COALESCE(EXCLUDED.iso_code, regions.iso_code)
       RETURNING id, country_code, name, iso_code`,
      [id, code, canonical, normalized, isoCode ?? null],
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
