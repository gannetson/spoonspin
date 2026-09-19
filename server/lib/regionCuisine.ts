/**
 * Detect which *regional* cuisine a restaurant serves.
 *
 * `restaurants.region_id` has existed since the regions feature landed and is
 * filtered on by `searchLocalRestaurants`, but nothing ever wrote it — so
 * picking Sichuan could only ever return zero restaurants. This fills it.
 *
 * The region of a restaurant here means the cuisine it cooks, not where the
 * building is: a Sichuanese place in Amsterdam is `cn:CN-SC`. That is what the
 * app asks for when someone spins China, opens Sichuan and looks for dinner.
 *
 * Terms come from the ISO subdivision names plus the curated alias files, which
 * carry both historical romanisations ("Canton", "Peking") and the cuisine
 * demonyms venues actually put on their signs ("Cantonese", "Szechuan",
 * "Teochew", "Hakata", "Isaan").
 */

import { loadCountryAliases, normalizeRegionName } from "../db/regions/catalog.ts";

/** Terms shorter than this collide with ordinary words and street names. */
const MIN_TERM_LENGTH = 4;

/**
 * Region names that are a bare compass direction or landform. Several countries
 * are catalogued by culinary macro-region ("Northern", "Central", "Costa"), and
 * those words appear in venue text constantly with no regional meaning at all —
 * so such regions are matched only through their curated aliases ("Isaan",
 * "Lanna", "Saigon", "Chifa"), never through the name itself.
 */
const GENERIC_REGION_NAMES = new Set([
  "central",
  "northern",
  "southern",
  "eastern",
  "western",
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
  "costa",
  "sierra",
  "selva",
  "highland",
  "lowland",
  // Region names that are also everyday words or pan-cuisine labels. Turkey is
  // catalogued with a region literally called "Mediterranean", which matched a
  // Bosnian grill and an Amsterdam mezze bar on the word alone; "Marche" is
  // French for market, and "Acre" is an English one.
  "mediterranean",
  "marche",
  "acre",
  // Capital-city regions whose names appear in venue names constantly without
  // meaning the cuisine of that region ("Café de Paris", "Madrid Tapas").
  "loire",
  "paris",
  "madrid",
  "lyon",
]);

export type RegionTermIndex = {
  /** region id -> the terms that identify it, longest first. */
  byRegionId: Map<string, string[]>;
  countryCode: string;
};

export type RegionRow = { id: string; name: string; isoCode?: string | null };

/**
 * Build the region -> terms index for one country.
 *
 * Only regions that actually exist in the database are indexed, because
 * `restaurants.region_id` is a foreign key — detecting a region we cannot store
 * would just fail the write.
 */
export function buildRegionTermIndex(
  countryCode: string,
  regions: RegionRow[],
): RegionTermIndex {
  const code = countryCode.toLowerCase();
  const byRegionId = new Map<string, string[]>();
  const byIsoCode = new Map<string, string>();

  const add = (regionId: string, term: string | undefined) => {
    const normalized = normalizeRegionName(term ?? "");
    if (normalized.length < MIN_TERM_LENGTH) return;
    const list = byRegionId.get(regionId) ?? [];
    if (!list.includes(normalized)) list.push(normalized);
    byRegionId.set(regionId, list);
  };

  for (const region of regions) {
    if (region.isoCode) byIsoCode.set(region.isoCode, region.id);
    if (!GENERIC_REGION_NAMES.has(normalizeRegionName(region.name))) {
      add(region.id, region.name);
    }
  }

  for (const [alias, isoCode] of Object.entries(loadCountryAliases(code))) {
    const regionId = byIsoCode.get(isoCode);
    if (regionId) add(regionId, alias);
  }

  // Longest term first so "inner mongolia" wins over a shorter overlapping one.
  for (const [regionId, terms] of byRegionId) {
    byRegionId.set(
      regionId,
      [...terms].sort((a, b) => b.length - a.length),
    );
  }

  return { byRegionId, countryCode: code };
}

export type RegionDetection = {
  regionId: string;
  matchedTerm: string;
};

function containsTerm(haystack: string, term: string): boolean {
  const pattern = new RegExp(`(^| )${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
  return pattern.test(haystack);
}

/**
 * Find the regional cuisine named in a venue's own text.
 *
 * Returns nothing when two different regions are named: a menu listing
 * Cantonese *and* Sichuanese dishes is a general Chinese restaurant, and
 * picking one would file it where a diner looking for that region would not
 * want to find it.
 *
 * The exception is nested names — "Baja California Sur" also contains "Baja
 * California" — where the longer, more specific region wins rather than the
 * pair cancelling out.
 */
export function detectRegion(input: {
  text: string;
  index: RegionTermIndex;
}): RegionDetection | undefined {
  const haystack = normalizeRegionName(input.text);
  if (!haystack) return undefined;

  const hits: { regionId: string; term: string }[] = [];
  for (const [regionId, terms] of input.index.byRegionId) {
    const term = terms.find((candidate) => containsTerm(haystack, candidate));
    if (term) hits.push({ regionId, term });
  }

  if (hits.length === 0) return undefined;

  hits.sort((a, b) => b.term.length - a.term.length);
  const best = hits[0]!;
  // Anything the winner does not simply contain is a competing claim.
  const competing = hits.slice(1).filter((hit) => !best.term.includes(hit.term));
  if (competing.length > 0) return undefined;

  return { regionId: best.regionId, matchedTerm: best.term };
}
