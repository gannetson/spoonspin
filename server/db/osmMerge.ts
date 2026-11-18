/**
 * How an OSM harvest merges into restaurants that are already stored.
 *
 * `upsertRestaurant` overwrites an existing row's name, address, city, source and
 * links with whatever the caller sends. That is right for a row that is still
 * plain OSM data, and wrong for one a person reviewed or that Google Places
 * enriched: a scheduled re-harvest would quietly undo that work. So a harvest
 * asks for a plan first, and only writes what the plan allows.
 *
 * Pure functions only (no database), so the rules are easy to test.
 */
import type { RestaurantUpsert, StoredRestaurant } from "./restaurants.ts";

export type ExistingOsmRow = Pick<
  StoredRestaurant,
  | "id"
  | "name"
  | "address"
  | "city"
  | "postcode"
  | "lat"
  | "lng"
  | "website"
  | "phone"
  | "source"
  | "reviewed"
  | "googlePlaceId"
  | "placesRefreshedAt"
  | "cuisineCodes"
  | "cuisineTags"
>;

export type MergePlan =
  /** Not stored yet: insert it (through `upsertRestaurant`, which also finds duplicates). */
  | { action: "insert" }
  /** Nothing new: no write at all. */
  | { action: "skip" }
  /** A plain, untouched OSM row whose data changed upstream: full upsert, as before. */
  | { action: "update" }
  /** Reviewed or enriched row: only add cuisine codes/tags and fill empty contact fields. */
  | {
      action: "merge";
      cuisineCodes: string[];
      cuisineTags: string[];
      website: string | null;
      phone: string | null;
      postcode: string | null;
    };

/** True when a person or another source has touched the row, so OSM must not overwrite it. */
export function isProtectedRow(row: ExistingOsmRow): boolean {
  return (
    row.reviewed ||
    row.source !== "overpass" ||
    Boolean(row.googlePlaceId) ||
    Boolean(row.placesRefreshedAt)
  );
}

const blank = (value: string | null | undefined) => !value || !value.trim();
const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim() === (b ?? "").trim();
/** An optional field OSM no longer has says nothing: it is not a change. */
const sameOrUnknown = (current: string | null | undefined, incoming: string | null | undefined) =>
  blank(incoming) || same(current, incoming);
const sameCoord = (a: number | null, b: number | null | undefined) =>
  a == null || b == null ? a == null && b == null : Math.abs(a - b) < 1e-6;
const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
const includesAll = (haystack: string[], needles: string[]) =>
  needles.every((needle) => haystack.includes(needle));

export function planOsmMerge(
  existing: ExistingOsmRow | undefined,
  incoming: RestaurantUpsert,
): MergePlan {
  if (!existing) return { action: "insert" };

  const codesKnown = includesAll(existing.cuisineCodes, incoming.cuisineCodes);
  const tagsKnown = includesAll(existing.cuisineTags, incoming.cuisineTags);

  if (isProtectedRow(existing)) {
    const website = blank(existing.website) && !blank(incoming.website) ? incoming.website! : null;
    const phone = blank(existing.phone) && !blank(incoming.phone) ? incoming.phone! : null;
    const postcode =
      blank(existing.postcode) && !blank(incoming.postcode) ? incoming.postcode! : null;
    if (codesKnown && tagsKnown && !website && !phone && !postcode) return { action: "skip" };
    return {
      action: "merge",
      cuisineCodes: union(existing.cuisineCodes, incoming.cuisineCodes),
      cuisineTags: union(existing.cuisineTags, incoming.cuisineTags),
      website,
      phone,
      postcode,
    };
  }

  const unchanged =
    codesKnown &&
    tagsKnown &&
    same(existing.name, incoming.name) &&
    same(existing.address, incoming.address) &&
    same(existing.city, incoming.city) &&
    sameOrUnknown(existing.postcode, incoming.postcode) &&
    sameOrUnknown(existing.website, incoming.website) &&
    sameOrUnknown(existing.phone, incoming.phone) &&
    sameCoord(existing.lat, incoming.lat) &&
    sameCoord(existing.lng, incoming.lng);
  return unchanged ? { action: "skip" } : { action: "update" };
}
