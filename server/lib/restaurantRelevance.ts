/**
 * Query planning and grounded relevance scoring for restaurant discovery.
 *
 * Discovery used to fan a cuisine out over eight cities and keep whatever came
 * back. Text Search always returns a full page of results, so "Armenian
 * restaurant in Groningen" quietly returns Groningen's popular Greek and
 * Lebanese places — and with no relevance test, all of them were kept. That is
 * why every country produced roughly the same list.
 *
 * The replacement leans on two things Google already knows and we were
 * discarding:
 *
 * 1. **Rank across several nationwide queries.** One query's top hit is weak
 *    evidence; the venue that several independent phrasings of a cuisine all
 *    put near the top is a real specialist.
 * 2. **Google's own cuisine types.** `primaryType: "turkish_restaurant"` on an
 *    Armenian search is the one-click "this is Turkish" the admin was making by
 *    hand — and it names where the venue belongs instead.
 *
 * Nothing here treats the search query as evidence. A candidate is scored only
 * on what its own listing says.
 */

import {
  placeTypeVerdict,
  placeTypeLabel,
  type PlaceTypeVerdict,
} from "../../src/restaurants/placeTypeCuisine.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";
import {
  buildMentionHaystack,
  findCuisineMentions,
  normalizeText,
  type CuisineTermIndex,
} from "./cuisineMention.ts";

/** How a query was derived, which sets how much its ranking is worth. */
export type QueryKind = "demonym" | "native" | "dish" | "focus";

export type PlannedQuery = {
  text: string;
  kind: QueryKind;
};

const QUERY_WEIGHT: Record<QueryKind, number> = {
  // An explicit demonym ("Armenian restaurant") is the most direct phrasing.
  demonym: 1,
  // Native-language wording finds venues that never use the English demonym.
  native: 1,
  // Dish names find real kitchens but also every neighbour cuisine serving it.
  dish: 0.6,
  // The admin's own focus text — helpful, but it narrows rather than qualifies.
  focus: 0.7,
};

/** Rank 0 is worth full weight; the tail is worth little. */
export function rankDecay(rank: number | undefined): number {
  const position = Math.max(0, rank ?? 0);
  return 1 / (1 + position * 0.35);
}

function dedupeQueries(queries: PlannedQuery[]): PlannedQuery[] {
  const seen = new Set<string>();
  const out: PlannedQuery[] = [];
  for (const query of queries) {
    const key = normalizeText(query.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(query);
  }
  return out;
}

/**
 * Strip the boilerplate the DB aliases already carry ("Armenian restaurant")
 * down to the bare demonym so we can recompose queries ourselves.
 */
function bareAlias(alias: string): string {
  return alias
    .replace(/\b(restaurant|restaurants|cuisine|keuken|eten|food|eethuis)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Regional labels curated into `cuisineAliases` ("Caucasus restaurant",
 * "Balkan restaurant") are what pull Georgian and Turkish venues into an
 * Armenian search. They are fine as evidence, useless as a query.
 */
const BROAD_ALIAS_RE =
  /\b(caucasus|caucasian|balkan|levant|levantine|mediterranean|middle.?east(ern)?|north.?african|west.?african|east.?african|scandinavian|nordic|asian|european|latin.?american|south.?american|caribbean|oriental|fusion)\b/i;

export function planDiscoveryQueries(input: {
  countryName: string;
  cuisineAliases?: string[];
  /** Signature dish names for the country (from its own recipes). */
  dishNames?: string[];
  /** Admin focus text — a city, a neighbourhood, or a dish. */
  focus?: string;
  maxQueries?: number;
}): PlannedQuery[] {
  const focus = input.focus?.trim();
  const country = input.countryName.trim();

  const demonyms = (input.cuisineAliases ?? [])
    .map(bareAlias)
    .filter((alias) => alias.length >= 3 && !BROAD_ALIAS_RE.test(alias));

  const queries: PlannedQuery[] = [];

  // Nationwide first — this is the search that behaves like Google Maps.
  queries.push({ text: `${country} restaurant Netherlands`, kind: "demonym" });
  for (const demonym of demonyms.slice(0, 3)) {
    queries.push({ text: `${demonym} restaurant Nederland`, kind: "demonym" });
  }
  queries.push({
    text: `authentic ${country} cuisine restaurant Netherlands`,
    kind: "native",
  });

  for (const dish of (input.dishNames ?? []).slice(0, 3)) {
    const name = dish.trim();
    if (name.length < 3) continue;
    queries.push({ text: `${name} ${country} restaurant Nederland`, kind: "dish" });
  }

  if (focus) {
    // The admin's focus narrows the same cuisine query — it never replaces it,
    // and it never becomes a per-city sweep.
    queries.push({ text: `${country} restaurant ${focus} Netherlands`, kind: "focus" });
    for (const demonym of demonyms.slice(0, 1)) {
      queries.push({ text: `${demonym} restaurant ${focus}`, kind: "focus" });
    }
  }

  return dedupeQueries(queries).slice(0, input.maxQueries ?? 8);
}

/** One place plus every query that surfaced it. */
export type MergedCandidate = {
  place: GroundedPlace;
  hits: { query: string; kind: QueryKind; rank: number | undefined }[];
};

/**
 * Collapse ranked query results onto unique venues, remembering each query that
 * found them. Venues found by several queries keep the best (lowest) rank per
 * query rather than the last one seen.
 */
export function mergeRankedResults(
  results: { query: string; kind: QueryKind; places: GroundedPlace[] }[],
): MergedCandidate[] {
  const byKey = new Map<string, MergedCandidate>();

  for (const result of results) {
    for (const place of result.places) {
      const key = place.placeId;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          place,
          hits: [{ query: result.query, kind: result.kind, rank: place.rank }],
        });
        continue;
      }
      const sameQuery = existing.hits.find((hit) => hit.query === result.query);
      if (sameQuery) {
        if ((place.rank ?? 99) < (sameQuery.rank ?? 99)) sameQuery.rank = place.rank;
      } else {
        existing.hits.push({ query: result.query, kind: result.kind, rank: place.rank });
      }
      // Keep whichever copy carries the richer listing.
      if (!existing.place.editorialSummary && place.editorialSummary) {
        existing.place.editorialSummary = place.editorialSummary;
      }
      if (!existing.place.placeTypes?.length && place.placeTypes?.length) {
        existing.place.placeTypes = place.placeTypes;
      }
    }
  }

  return [...byKey.values()];
}

export type RelevanceScore = {
  score: number;
  /** Short human-readable justifications, shown to the admin. */
  reasons: string[];
  /** Countries the venue's own listing points at instead of the searched one. */
  mismatchCodes: string[];
  /**
   * The subset of `mismatchCodes` that Google's own primary category asserts.
   * Only these are strong enough to file a venue under another country
   * unattended; a country word in a venue's name is not.
   */
  typeMismatchCodes: string[];
  typeVerdict: PlaceTypeVerdict["kind"];
  /** Evidence drawn from the listing itself — never from the search query. */
  listingEvidence: string[];
};

const SCORE = {
  nameMentionsCountry: 3,
  typeMatch: 3,
  typeRegionMatch: 0.5,
  typeRegionMismatch: -2,
  typeMismatch: -3.5,
  summaryMentionsCountry: 1.5,
  sourceTagMatch: 2.5,
  nameMentionsOtherCountry: -2.5,
} as const;

/** Candidates below this are not worth an OpenAI call or an admin's attention. */
export const KEEP_THRESHOLD = 1.5;

/**
 * Score one candidate against the searched country.
 *
 * `index` is the shared country→terms index; `searchTerms` are the searched
 * country's own terms, including dish names, which `index` does not carry.
 */
export function scoreCandidate(input: {
  candidate: MergedCandidate;
  searchCode: string;
  index: CuisineTermIndex;
  /** Extra searched-country terms (dish names, native words). */
  extraTerms?: string[];
}): RelevanceScore {
  const { candidate, searchCode } = input;
  const place = candidate.place;
  const reasons: string[] = [];
  const listingEvidence: string[] = [];
  const mismatch = new Set<string>();
  const typeMismatch = new Set<string>();

  // 1. Consensus across independent queries, weighted by rank.
  let consensus = 0;
  for (const hit of candidate.hits) {
    consensus += QUERY_WEIGHT[hit.kind] * rankDecay(hit.rank);
  }
  consensus = Math.min(consensus, 4);
  const topHit = candidate.hits.reduce<number | undefined>(
    (best, hit) => (best == null || (hit.rank ?? 99) < best ? (hit.rank ?? 99) : best),
    undefined,
  );
  reasons.push(
    `Ranked by ${candidate.hits.length} cuisine quer${candidate.hits.length === 1 ? "y" : "ies"}` +
      (topHit != null ? `, best position #${topHit + 1}` : ""),
  );

  let score = consensus;

  // 2. Google's own cuisine typing.
  const verdict = placeTypeVerdict(searchCode, {
    primaryType: place.primaryType,
    types: place.placeTypes,
  });
  if (verdict.kind === "match") {
    score += SCORE.typeMatch;
    reasons.push(`Google lists it as a ${placeTypeLabel(verdict.type).toLowerCase()}`);
    listingEvidence.push(`Google category: ${placeTypeLabel(verdict.type)}`);
  } else if (verdict.kind === "mismatch") {
    score += SCORE.typeMismatch;
    for (const code of verdict.codes) {
      mismatch.add(code);
      typeMismatch.add(code);
    }
    reasons.push(
      `Google lists it as a ${placeTypeLabel(verdict.type).toLowerCase()}, not this cuisine`,
    );
    listingEvidence.push(`Google category: ${placeTypeLabel(verdict.type)}`);
  } else if (verdict.kind === "region") {
    score += SCORE.typeRegionMatch;
    listingEvidence.push(`Google category: ${placeTypeLabel(verdict.type)}`);
  } else if (verdict.kind === "region-mismatch") {
    score += SCORE.typeRegionMismatch;
    reasons.push(
      `Google's ${placeTypeLabel(verdict.type).toLowerCase()} category excludes this cuisine`,
    );
    listingEvidence.push(`Google category: ${placeTypeLabel(verdict.type)}`);
  }

  // 3. The venue's own name and blurb.
  const searchTerms = [
    ...(input.index.byCode.get(searchCode.toLowerCase()) ?? []),
    ...(input.extraTerms ?? []).map(normalizeText).filter((term) => term.length >= 4),
  ];
  const nameHaystack = normalizeText(place.name);
  const nameMatch = searchTerms.filter((term) => nameHaystack.includes(term));
  if (nameMatch.length > 0) {
    score += SCORE.nameMentionsCountry;
    reasons.push(`Name says “${nameMatch[0]}”`);
    listingEvidence.push(`Venue name: ${place.name}`);
  }

  // A contrary demonym in the name counts even when a searched term also
  // matched. Neighbouring cuisines share dishes, so "Hello Couscous |
  // Traditioneel Marokkaans eten" hits an Algerian dish term and is still,
  // by its own sign, a Moroccan restaurant.
  const otherInName = findCuisineMentions({
    text: place.name,
    searchCode,
    index: input.index,
  });
  if (otherInName.otherCountryCodes.length > 0) {
    score += SCORE.nameMentionsOtherCountry;
    for (const code of otherInName.otherCountryCodes) mismatch.add(code);
    reasons.push("Name names a different cuisine");
  }

  const blurb = buildMentionHaystack([
    place.editorialSummary,
    ...(place.sourceCuisineTags ?? []),
  ]);
  if (blurb.trim()) {
    listingEvidence.push(
      place.editorialSummary ? `Google summary: ${place.editorialSummary}` : "",
      place.sourceCuisineTags?.length
        ? `${place.source} cuisine tags: ${place.sourceCuisineTags.join(", ")}`
        : "",
    );
    const blurbHaystack = normalizeText(blurb);
    if (searchTerms.some((term) => blurbHaystack.includes(term))) {
      score += place.sourceCuisineTags?.length
        ? SCORE.sourceTagMatch
        : SCORE.summaryMentionsCountry;
      reasons.push("Listing description names this cuisine");
    } else {
      const otherInBlurb = findCuisineMentions({
        text: blurb,
        searchCode,
        index: input.index,
      });
      for (const code of otherInBlurb.otherCountryCodes) mismatch.add(code);
    }
  }

  // 4. An OSM cuisine tag is a human editor's explicit claim — strongest of all.
  if (place.source === "osm") {
    const tags = osmTagsForCountry(searchCode);
    if (tags.length > 0) {
      score += SCORE.typeMatch;
      reasons.push(`OpenStreetMap tags it cuisine=${tags[0]}`);
      listingEvidence.push(`OpenStreetMap: cuisine=${tags.join(";")}`);
    }
  }

  mismatch.delete(searchCode.toLowerCase());
  typeMismatch.delete(searchCode.toLowerCase());

  return {
    score: Math.round(score * 100) / 100,
    reasons,
    mismatchCodes: [...mismatch].slice(0, 3),
    typeMismatchCodes: [...typeMismatch].slice(0, 3),
    typeVerdict: verdict.kind,
    listingEvidence: listingEvidence.filter(Boolean),
  };
}
