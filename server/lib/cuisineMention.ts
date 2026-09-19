/**
 * Evidence check: is the searched country / cuisine *explicitly* mentioned
 * in a candidate's listing fields or fetched page text?
 *
 * Discovery sources return whatever their search ranked, which is often only
 * loosely related to the query. This turns "the query was Thai" into "the word
 * Thai (or a Thai-cuisine term) actually appears in the listing or on the
 * site". When the searched country is absent but another country's terms are
 * present, the caller can suggest filing the venue under that country instead.
 */

import { OSM_CUISINE_BY_COUNTRY, WEAK_OSM_CUISINE_TAGS } from "../../src/restaurants/osmCuisineMap.ts";

/** Terms shorter than this produce too many incidental hits to trust. */
const MIN_TERM_LENGTH = 4;

/**
 * Words that are a country/cuisine term but overwhelmingly appear in NL venue
 * text with an unrelated meaning. Matching these alone would mis-file venues.
 */
const AMBIGUOUS_TERMS = new Set([
  "turkey", // the bird on menus
  "china", // china cabinet / bone china
  "chile", // chile pepper
  "jordan", // person name
  "ceylon", // tea
  "java", // coffee
  "mocha", // coffee
  "holland",
  "nederland",
  "netherlands",
  "dutch",
]);

export type CountryTerms = {
  code: string;
  terms: string[];
};

export type CuisineTermIndex = {
  byCode: Map<string, string[]>;
};

/** Lowercase, strip diacritics, normalize separators. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usableTerm(term: string): boolean {
  const normalized = normalizeText(term);
  if (normalized.length < MIN_TERM_LENGTH) return false;
  if (AMBIGUOUS_TERMS.has(normalized)) return false;
  return true;
}

/**
 * Build the code -> terms index from the country catalog/DB rows plus the OSM
 * cuisine tag map. `cuisineAliases` (curated per country in the DB) is the
 * richest source of demonyms, e.g. "Albanees", "Albanian".
 */
export function buildCuisineTermIndex(
  countries: { code: string; name: string; cuisineAliases?: string[] }[],
): CuisineTermIndex {
  const byCode = new Map<string, string[]>();

  const add = (code: string, term: string | undefined) => {
    if (!term) return;
    if (!usableTerm(term)) return;
    const key = code.toLowerCase();
    const normalized = normalizeText(term);
    const list = byCode.get(key) ?? [];
    if (!list.includes(normalized)) list.push(normalized);
    byCode.set(key, list);
  };

  for (const country of countries) {
    add(country.code, country.name);
    for (const alias of country.cuisineAliases ?? []) {
      add(country.code, alias);
    }
  }

  for (const [code, tags] of Object.entries(OSM_CUISINE_BY_COUNTRY)) {
    for (const tag of tags) {
      if (WEAK_OSM_CUISINE_TAGS.has(tag.toLowerCase())) continue;
      add(code, tag);
    }
  }

  return { byCode };
}

function containsTerm(haystack: string, term: string): boolean {
  // Haystack and term are already normalized to "a-z0-9 " only.
  const pattern = new RegExp(`(^| )${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
  return pattern.test(haystack);
}

export type MentionEvidence = {
  /** The searched country's own terms found in the text. */
  matchedTerms: string[];
  /** True when at least one searched-country term appears. */
  mentioned: boolean;
  /** Other countries whose terms appear, strongest first. */
  otherCountryCodes: string[];
};

/**
 * Look for the searched country's terms in `text`; when absent, report which
 * other countries are named so the caller can suggest a reassignment.
 */
export function findCuisineMentions(input: {
  text: string;
  searchCode: string;
  index: CuisineTermIndex;
}): MentionEvidence {
  const haystack = normalizeText(input.text);
  const searchCode = input.searchCode.toLowerCase();

  if (!haystack) {
    return { matchedTerms: [], mentioned: false, otherCountryCodes: [] };
  }

  const matchedTerms = (input.index.byCode.get(searchCode) ?? []).filter((term) =>
    containsTerm(haystack, term),
  );

  if (matchedTerms.length > 0) {
    return { matchedTerms, mentioned: true, otherCountryCodes: [] };
  }

  const scored: { code: string; hits: number }[] = [];
  for (const [code, terms] of input.index.byCode) {
    if (code === searchCode) continue;
    const hits = terms.filter((term) => containsTerm(haystack, term)).length;
    if (hits > 0) scored.push({ code, hits });
  }
  scored.sort((a, b) => b.hits - a.hits || a.code.localeCompare(b.code));

  return {
    matchedTerms: [],
    mentioned: false,
    otherCountryCodes: scored.slice(0, 3).map((entry) => entry.code),
  };
}

/** Join the listing fields and fetched page text into one haystack. */
export function buildMentionHaystack(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" \n ");
}
