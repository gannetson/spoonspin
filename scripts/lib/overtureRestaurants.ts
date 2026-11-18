/**
 * Overture Maps as a second source of restaurants.
 *
 * Overture's places theme merges several open datasets and has real categories
 * (`korean_restaurant`), so it finds restaurants OSM only knows without a cuisine tag.
 * It is read straight from Overture's public GeoParquet files on S3 with DuckDB, one
 * query per map tile (the same 0.5° grid as the OSM harvest). No account, no API key,
 * no per-call cost.
 *
 * DuckDB is an optional dependency: without it the harvest says so and stops.
 */
import type { RestaurantUpsert } from "../../server/db/restaurants.ts";
import {
  OVERTURE_CUISINE_CATEGORIES,
  osmTagForCountry,
  overtureCuisineCodes,
} from "../../src/restaurants/overtureCuisineMap.ts";
import type { Tile } from "./overpassTiles.ts";

const S3_HOST = "https://overturemaps-us-west-2.s3.amazonaws.com";
const S3_BUCKET_PATH = "s3://overturemaps-us-west-2/release";
export const DEFAULT_MIN_CONFIDENCE = 0.7;

export type OvertureRow = {
  id: string;
  name: string | null;
  category: string | null;
  alternates: string[] | null;
  confidence: number | null;
  street: string | null;
  city: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  phone: string | null;
};

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** The newest release folder, from the bucket listing ("2026-11-18.0"). */
export async function latestOvertureRelease(): Promise<string> {
  const response = await fetch(`${S3_HOST}/?list-type=2&prefix=release/&delimiter=/`);
  if (!response.ok)
    throw new Error(`Could not list Overture releases: HTTP ${response.status}`);
  const xml = await response.text();
  const releases = [...xml.matchAll(/release\/(\d{4}-\d{2}-\d{2}\.\d+)\//g)].map(
    (m) => m[1]!,
  );
  if (releases.length === 0)
    throw new Error("No Overture releases found in the bucket listing");
  return releases.sort().at(-1)!;
}

function placesSource(release: string): string {
  return `read_parquet('${S3_BUCKET_PATH}/${release}/theme=places/type=place/*', hive_partitioning=1)`;
}

const num = (value: number) => {
  if (!Number.isFinite(value)) throw new Error(`Not a number: ${value}`);
  return String(value);
};

/**
 * The query for one tile: open, confident places in a specific-cuisine category (as the
 * primary category or among the alternates). Points are matched on `bbox.xmin/ymin`, which
 * for a point is its longitude and latitude, so DuckDB can skip files without reading
 * geometry. The tile is half-open (west/south inclusive) so neighbours never both return a place.
 */
export function buildOvertureTileQuery(
  tile: Pick<Tile, "south" | "west" | "north" | "east">,
  release: string,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  categories: string[] = OVERTURE_CUISINE_CATEGORIES,
): string {
  const list = categories.map(q).join(", ");
  return `
SELECT
  id,
  names.primary AS name,
  taxonomy.primary AS category,
  taxonomy.alternates AS alternates,
  confidence,
  addresses[1].freeform AS street,
  addresses[1].locality AS city,
  addresses[1].postcode AS postcode,
  bbox.ymin AS lat,
  bbox.xmin AS lng,
  websites[1] AS website,
  phones[1] AS phone
FROM ${placesSource(release)}
WHERE bbox.xmin >= ${num(tile.west)} AND bbox.xmin < ${num(tile.east)}
  AND bbox.ymin >= ${num(tile.south)} AND bbox.ymin < ${num(tile.north)}
  AND (operating_status IS NULL OR operating_status = 'open')
  AND confidence >= ${num(minConfidence)}
  AND (taxonomy.primary IN (${list}) OR list_has_any(taxonomy.alternates, [${list}]))
`.trim();
}

/** Restaurant categories in a tile that we do not map yet, to spot cuisines worth adding. */
export function buildUnmappedCategoriesQuery(
  tile: Pick<Tile, "south" | "west" | "north" | "east">,
  release: string,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  categories: string[] = OVERTURE_CUISINE_CATEGORIES,
): string {
  return `
SELECT taxonomy.primary AS category, count(*)::INT AS n
FROM ${placesSource(release)}
WHERE bbox.xmin >= ${num(tile.west)} AND bbox.xmin < ${num(tile.east)}
  AND bbox.ymin >= ${num(tile.south)} AND bbox.ymin < ${num(tile.north)}
  AND confidence >= ${num(minConfidence)}
  AND taxonomy.primary LIKE '%restaurant%'
  AND taxonomy.primary NOT IN (${categories.map(q).join(", ")})
GROUP BY 1 ORDER BY n DESC
`.trim();
}

const cleanText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * One Overture row to one restaurant row. Null when it has no name, no location, or no
 * category that names a single cuisine. The OSM tag of each country goes into
 * `cuisineTags`, so the row passes the same promotion rule as a tagged OSM place.
 */
export function overtureRowToRestaurant(
  row: OvertureRow,
  fallbackPlace: (lat: number, lng: number) => string,
): RestaurantUpsert | null {
  const name = cleanText(row.name);
  if (!name || row.lat == null || row.lng == null) return null;
  const codes = overtureCuisineCodes([row.category, ...(row.alternates ?? [])]);
  if (codes.length === 0) return null;

  const street = cleanText(row.street);
  const postcode = cleanText(row.postcode);
  const city = cleanText(row.city);
  const address =
    [street, postcode, city].filter(Boolean).join(", ") ||
    `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`;
  const osmId = `overture/${row.id}`;
  const mapsQuery = encodeURIComponent(`${name} ${address}`);

  return {
    id: `overture:${row.id}`,
    name,
    address,
    city: city ?? fallbackPlace(row.lat, row.lng),
    postcode,
    lat: row.lat,
    lng: row.lng,
    cuisineCodes: codes,
    cuisineTags: codes.map((code) => osmTagForCountry(code)!),
    website: cleanText(row.website),
    phone: cleanText(row.phone),
    source: "overture",
    osmId,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
  };
}

type DuckConnection = {
  run(sql: string): Promise<unknown>;
  runAndReadAll(sql: string): Promise<{ getRowObjectsJson(): unknown[] }>;
  closeSync?: () => void;
};

export class OvertureSource {
  private constructor(
    private readonly connection: DuckConnection,
    readonly release: string,
  ) {}

  /** Opens DuckDB with S3 access. Throws a readable error when the optional package is missing. */
  static async open(release?: string): Promise<OvertureSource> {
    let duck: {
      DuckDBInstance: {
        create(path: string): Promise<{ connect(): Promise<DuckConnection> }>;
      };
    };
    try {
      // Optional dependency, so it is resolved at run time, not at import time.
      const moduleName = "@duckdb/node-api";
      duck = (await import(moduleName)) as typeof duck;
    } catch {
      throw new Error(
        "@duckdb/node-api is not installed. Run `npm install` (it is an optional dependency, " +
          "and its prebuilt binary may not exist for this platform).",
      );
    }
    const instance = await duck.DuckDBInstance.create(":memory:");
    const connection = await instance.connect();
    await connection.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
    return new OvertureSource(connection, release ?? (await latestOvertureRelease()));
  }

  async fetchTile(
    tile: Tile,
    options: { minConfidence?: number } = {},
  ): Promise<OvertureRow[]> {
    const sql = buildOvertureTileQuery(tile, this.release, options.minConfidence);
    const reader = await this.connection.runAndReadAll(sql);
    return reader.getRowObjectsJson() as OvertureRow[];
  }

  async unmappedCategories(
    tile: Tile,
    options: { minConfidence?: number } = {},
  ): Promise<Array<{ category: string; n: number }>> {
    const sql = buildUnmappedCategoriesQuery(tile, this.release, options.minConfidence);
    const reader = await this.connection.runAndReadAll(sql);
    return reader.getRowObjectsJson() as Array<{ category: string; n: number }>;
  }

  close() {
    this.connection.closeSync?.();
  }
}
