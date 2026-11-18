/**
 * Tile-based OSM harvesting.
 *
 * The country is cut into a grid of lat/lng tiles. One Overpass request per tile
 * asks for every specialty cuisine at once (the union of all countries' cuisine
 * tags is under 1 KB), and each place is then assigned to the countries whose
 * tags it carries. That replaces "hub x country" circle searches: the whole
 * country is covered, with about 1/80 of the requests.
 *
 * A tile that times out or hits a busy server is split into four and retried,
 * so dense areas (Amsterdam) degrade into smaller requests instead of failing.
 */
import type { RestaurantUpsert } from "../../server/db/restaurants.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import {
  NL_BBOX,
  buildOverpassBboxQuery,
  elementToRestaurantForCodes,
  fetchOverpass,
  sleep,
  type FetchOverpassOptions,
  type Hub,
  type OverpassElement,
} from "./overpassRestaurants.ts";

export type Tile = {
  id: string;
  south: number;
  west: number;
  north: number;
  east: number;
};

type Bbox = { south: number; west: number; north: number; east: number };

export const DEFAULT_TILE_DEG = 0.5;
/** A tile may be split this many times (0.5 deg -> 0.25 -> 0.125) before it counts as failed. */
export const MAX_SPLIT_DEPTH = 2;

const hundredths = (deg: number) => Math.round(deg * 100);

/** Tiles covering `bbox`, `stepDeg` on a side. Ids are stable for a given grid. */
export function buildTiles(bbox: Bbox = NL_BBOX, stepDeg = DEFAULT_TILE_DEG): Tile[] {
  if (!(stepDeg > 0)) throw new Error("tile size must be positive");
  const step = hundredths(stepDeg);
  const tiles: Tile[] = [];
  for (let south = hundredths(bbox.south); south < hundredths(bbox.north); south += step) {
    for (let west = hundredths(bbox.west); west < hundredths(bbox.east); west += step) {
      const north = Math.min(south + step, hundredths(bbox.north));
      const east = Math.min(west + step, hundredths(bbox.east));
      tiles.push({
        id: `t${step}:${south}:${west}`,
        south: south / 100,
        west: west / 100,
        north: north / 100,
        east: east / 100,
      });
    }
  }
  return tiles;
}

/** Four quarters of a tile, with ids derived from the parent. */
export function splitTile(tile: Tile): Tile[] {
  const midLat = Math.round(((tile.south + tile.north) / 2) * 1e5) / 1e5;
  const midLng = Math.round(((tile.west + tile.east) / 2) * 1e5) / 1e5;
  return [
    { ...tile, id: `${tile.id}/0`, north: midLat, east: midLng },
    { ...tile, id: `${tile.id}/1`, north: midLat, west: midLng },
    { ...tile, id: `${tile.id}/2`, south: midLat, east: midLng },
    { ...tile, id: `${tile.id}/3`, south: midLat, west: midLng },
  ];
}

export function tileCenter(tile: Tile): { lat: number; lng: number } {
  return { lat: (tile.south + tile.north) / 2, lng: (tile.west + tile.east) / 2 };
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Tiles nearest a hub first (big cities have the most specialty restaurants); ties keep grid order. */
export function orderTiles(tiles: Tile[], hubs: Hub[]): Tile[] {
  if (hubs.length === 0) return [...tiles];
  const nearest = (tile: Tile) => {
    const center = tileCenter(tile);
    return Math.min(...hubs.map((hub) => distanceKm(center, hub)));
  };
  return tiles
    .map((tile, index) => ({ tile, index, km: nearest(tile) }))
    .sort((a, b) => a.km - b.km || a.index - b.index)
    .map((entry) => entry.tile);
}

/** Every cuisine tag any of `countryCodes` uses, once, sorted. */
export function unionCuisineTags(countryCodes: string[]): string[] {
  return Array.from(new Set(countryCodes.flatMap((code) => osmTagsForCountry(code)))).sort();
}

/** Short stable id of a tag set: a changed country list gives new job ids, so tiles are searched again. */
export function tagSignature(tags: string[]): string {
  let hash = 5381;
  for (const char of tags.join("|")) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

/** Server too busy, timed out or out of memory: a smaller area can succeed, a bad query cannot. */
export function isLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;
  return /busy|timed? ?out|timeout|memory|too many|429|502|504|runtime error|rate.?limit/i.test(
    error.message,
  );
}

export type TileHarvest = {
  places: RestaurantUpsert[];
  /** OSM elements returned, before name and cuisine filtering. */
  elements: number;
  requests: number;
  splits: number;
  /** Sub-tiles that still failed after splitting. The job is not complete while any remain. */
  failed: string[];
};

export type HarvestTileOptions = {
  fetchElements?: (query: string, options: FetchOverpassOptions) => Promise<OverpassElement[]>;
  delayMs?: number;
  maxDepth?: number;
  serverTimeoutSeconds?: number;
  log?: (message: string) => void;
};

export async function harvestTile(
  tile: Tile,
  countryCodes: string[],
  options: HarvestTileOptions = {},
): Promise<TileHarvest> {
  const tags = unionCuisineTags(countryCodes);
  if (tags.length === 0) {
    return { places: [], elements: 0, requests: 0, splits: 0, failed: [] };
  }
  const fetchElements =
    options.fetchElements ?? ((query, opts) => fetchOverpass(query, 1, 0, opts));
  const delayMs = options.delayMs ?? 4000;
  const maxDepth = options.maxDepth ?? MAX_SPLIT_DEPTH;
  const serverTimeout = options.serverTimeoutSeconds ?? 120;
  const log = options.log ?? (() => {});

  // Tiles share borders, so one place can arrive twice: keep one per OSM id.
  const seen = new Map<string, OverpassElement>();
  const failed: string[] = [];
  let requests = 0;
  let splits = 0;

  async function run(current: Tile, depth: number): Promise<void> {
    try {
      requests += 1;
      const elements = await fetchElements(
        buildOverpassBboxQuery(tags, current, serverTimeout),
        { timeoutMs: (serverTimeout + 30) * 1000, maxAttempts: 3 },
      );
      for (const element of elements) seen.set(`${element.type}/${element.id}`, element);
    } catch (error) {
      if (!isLoadError(error)) throw error;
      if (depth >= maxDepth) {
        log(`tile ${current.id} still failing at the smallest size: ${(error as Error).message}`);
        failed.push(current.id);
        return;
      }
      splits += 1;
      log(`tile ${current.id} too heavy, splitting in four`);
      for (const child of splitTile(current)) {
        await sleep(delayMs);
        await run(child, depth + 1);
      }
    }
  }

  await run(tile, 0);

  const places: RestaurantUpsert[] = [];
  for (const element of seen.values()) {
    const place = elementToRestaurantForCodes(element, countryCodes);
    if (place) places.push(place);
  }
  return { places, elements: seen.size, requests, splits, failed };
}
