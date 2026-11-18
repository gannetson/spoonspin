/**
 * Is this place the same venue as one we already store? Used when a second data source
 * (Overture) brings places that OSM may already have. Two sources give the same venue
 * different ids, slightly different names ("Restaurant Bavet" / "Bavet") and coordinates
 * a few metres apart, so a match needs both closeness and a similar name.
 *
 * Pure functions only (no database), so the rules are easy to test.
 */

export type VenuePoint = { name: string; lat: number | null; lng: number | null };

const FILLER_WORDS = new Set([
  "restaurant",
  "ristorante",
  "restaurante",
  "cafe",
  "bar",
  "the",
  "de",
  "het",
  "een",
  "la",
  "le",
  "el",
  "and",
  "en",
  "und",
  "bv",
  "gmbh",
]);

/** Lower-case, no accents or punctuation, no filler words ("Restaurant", "The"). */
export function normalizeVenueName(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !FILLER_WORDS.has(word));
  return words.join(" ");
}

/** 0 to 1: 1 for the same name once normalized, else the share of words they have in common. */
export function nameSimilarity(a: string, b: string): number {
  const left = normalizeVenueName(a);
  const right = normalizeVenueName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  // "Bavet" inside "Bavet Aachen": the shorter name is wholly contained.
  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  if (shorter.length >= 4 && ` ${longer} `.includes(` ${shorter} `)) return 0.9;
  const leftWords = new Set(left.split(" "));
  const rightWords = right.split(" ");
  const shared = rightWords.filter((word) => leftWords.has(word)).length;
  return shared / Math.max(leftWords.size, rightWords.length);
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Matching rule: right next door (40 m) a loosely similar name is enough; within 150 m
 * the name has to be clearly the same. Further apart is never the same venue. Two
 * different restaurants in one building rarely share a name, and the cuisine check that
 * follows promotion removes the odd wrong merge.
 */
export function isSameVenue(a: VenuePoint, b: VenuePoint): boolean {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return false;
  const meters = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  if (meters > 150) return false;
  const similarity = nameSimilarity(a.name, b.name);
  return meters <= 40 ? similarity >= 0.34 : similarity >= 0.6;
}

/** The closest candidate that is the same venue, if any. */
export function findMatchingVenue<T extends VenuePoint>(
  place: VenuePoint,
  candidates: T[],
): T | undefined {
  if (place.lat == null || place.lng == null) return undefined;
  const here = { lat: place.lat, lng: place.lng };
  let best: T | undefined;
  let bestMeters = Infinity;
  for (const candidate of candidates) {
    if (!isSameVenue(place, candidate)) continue;
    const meters = distanceMeters(here, { lat: candidate.lat!, lng: candidate.lng! });
    if (meters < bestMeters) {
      best = candidate;
      bestMeters = meters;
    }
  }
  return best;
}
