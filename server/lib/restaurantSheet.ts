/**
 * Parse a curated "restaurants per country" spreadsheet into importable rows.
 *
 * The sheet is maintained by hand, so this reads columns by header name rather
 * than position and reports what it could not understand instead of dropping it
 * silently — a renamed country or a new column should show up in the run
 * summary, not vanish.
 */

import { countryCatalog } from "../../src/content/countries/catalog.ts";

/** How closely a listing matches the cuisine it is filed under. */
export type SheetMatchLevel = "country" | "regional" | "inspired";

export type SheetListing = {
  /** Cuisine country as written in the sheet, e.g. "Algerije". */
  cuisineCountry: string;
  countryCode: string;
  name: string;
  city: string;
  /** Country the venue sits in — the sheet covers NL plus the border region. */
  venueCountry: string;
  cuisineLabel: string;
  match: SheetMatchLevel;
  url?: string;
  note?: string;
  /** 1-based row in the worksheet, for error reporting. */
  row: number;
};

export type SheetSkip = { row: number; reason: string; values: string[] };

export type SheetParseResult = {
  listings: SheetListing[];
  skipped: SheetSkip[];
  /** Country labels that resolved to no ISO code, each reported once. */
  unknownCountries: string[];
};

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Header synonyms, so an English or lightly renamed sheet still imports. */
const COLUMNS: Record<string, string[]> = {
  cuisineCountry: ["keukenland", "land", "cuisine country", "country"],
  name: ["restaurant", "naam", "name", "venue"],
  city: ["plaats", "stad", "city", "town"],
  venueCountry: ["vestigingsland", "venue country", "location country"],
  cuisineLabel: ["keuken regio", "keuken", "cuisine regio", "cuisine"],
  match: ["match", "type", "soort"],
  url: ["url", "website", "link"],
  note: ["bron controle", "bron", "source", "toelichting", "note"],
};

/**
 * Countries whose sheet spelling differs from the Dutch CLDR name.
 * Everything else resolves through `Intl.DisplayNames`.
 */
const COUNTRY_OVERRIDES: Record<string, string> = {
  myanmar: "mm",
  birma: "mm",
  palestina: "ps",
  "palestijnse gebieden": "ps",
  slovakije: "sk",
  slowakije: "sk",
  "verenigde staten": "us",
  "verenigd koninkrijk": "gb",
  engeland: "gb",
  "zuid korea": "kr",
  "noord korea": "kp",
  ivoorkust: "ci",
  kaapverdie: "cv",
  "congo kinshasa": "cd",
  "congo brazzaville": "cg",
  "oost timor": "tl",
  kosovo: "xk",
};

/** Build a "country label -> ISO code" map across Dutch and English naming. */
export function buildCountryNameIndex(
  locales: string[] = ["nl", "en"],
): Map<string, string> {
  const index = new Map<string, string>();
  for (const locale of locales) {
    let display: Intl.DisplayNames;
    try {
      display = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      continue;
    }
    for (const entry of countryCatalog) {
      const label = display.of(entry.code.toUpperCase());
      if (!label) continue;
      const key = normalize(label);
      if (key && !index.has(key)) index.set(key, entry.code);
    }
  }
  // Catalog names win nothing here, but they cover codes CLDR spells oddly.
  for (const entry of countryCatalog) {
    const key = normalize(entry.name);
    if (key && !index.has(key)) index.set(key, entry.code);
  }
  for (const [label, code] of Object.entries(COUNTRY_OVERRIDES)) {
    index.set(normalize(label), code);
  }
  return index;
}

export function matchLevelFromLabel(value: string | undefined): SheetMatchLevel {
  const key = normalize(value);
  if (key.startsWith("land") || key.startsWith("country")) return "country";
  if (key.startsWith("geinspireerd") || key.startsWith("inspired")) return "inspired";
  return "regional";
}

function findHeaderRow(rows: string[][]): number {
  const wanted = new Set(COLUMNS.cuisineCountry!.concat(COLUMNS.name!));
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const cells = (rows[i] ?? []).map(normalize);
    const hits = cells.filter((cell) => wanted.has(cell)).length;
    if (hits >= 2) return i;
  }
  return -1;
}

function mapColumns(header: string[]): Record<string, number> {
  const normalized = header.map(normalize);
  const mapping: Record<string, number> = {};
  for (const [field, synonyms] of Object.entries(COLUMNS)) {
    const index = normalized.findIndex((cell) => synonyms.includes(cell));
    if (index >= 0) mapping[field] = index;
  }
  return mapping;
}

export function parseRestaurantSheet(rows: string[][]): SheetParseResult {
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) {
    throw new Error(
      "Could not find a header row — expected columns like 'Keukenland' and 'Restaurant'.",
    );
  }
  const columns = mapColumns(rows[headerRow] ?? []);
  for (const required of ["cuisineCountry", "name", "city"]) {
    if (columns[required] === undefined) {
      throw new Error(`Sheet is missing a '${required}' column.`);
    }
  }

  const countries = buildCountryNameIndex();
  const listings: SheetListing[] = [];
  const skipped: SheetSkip[] = [];
  const unknown = new Set<string>();

  const cell = (row: string[], field: string): string =>
    (columns[field] !== undefined ? (row[columns[field]!] ?? "") : "").trim();

  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;
    const cuisineCountry = cell(row, "cuisineCountry");
    const name = cell(row, "name");
    const city = cell(row, "city");

    if (!cuisineCountry && !name) continue; // blank spacer row
    if (!name || !city) {
      skipped.push({
        row: rowNumber,
        reason: "missing restaurant name or city",
        values: row,
      });
      continue;
    }

    const countryCode = countries.get(normalize(cuisineCountry));
    if (!countryCode) {
      unknown.add(cuisineCountry);
      skipped.push({
        row: rowNumber,
        reason: `unknown cuisine country "${cuisineCountry}"`,
        values: row,
      });
      continue;
    }

    listings.push({
      cuisineCountry,
      countryCode,
      name,
      city,
      venueCountry: cell(row, "venueCountry") || "Nederland",
      cuisineLabel: cell(row, "cuisineLabel"),
      match: matchLevelFromLabel(cell(row, "match")),
      url: cell(row, "url") || undefined,
      note: cell(row, "note") || undefined,
      row: rowNumber,
    });
  }

  return { listings, skipped, unknownCountries: [...unknown] };
}

/** One physical venue, with every cuisine the sheet files it under. */
export type SheetVenue = {
  key: string;
  name: string;
  city: string;
  venueCountry: string;
  url?: string;
  notes: string[];
  cuisines: { countryCode: string; match: SheetMatchLevel; label: string }[];
};

export function venueKey(name: string, city: string): string {
  return `${normalize(name)}|${normalize(city)}`;
}

/**
 * Collapse listings onto unique venues.
 *
 * The sheet deliberately repeats a venue under every cuisine it can serve —
 * one African kitchen stands in for fourteen countries — so grounding and
 * storing per row would mean fourteen lookups and fourteen duplicate rows for
 * one restaurant.
 */
export function groupByVenue(listings: SheetListing[]): SheetVenue[] {
  const byKey = new Map<string, SheetVenue>();
  for (const listing of listings) {
    const key = venueKey(listing.name, listing.city);
    const existing = byKey.get(key);
    const cuisine = {
      countryCode: listing.countryCode,
      match: listing.match,
      label: listing.cuisineLabel,
    };
    if (!existing) {
      byKey.set(key, {
        key,
        name: listing.name,
        city: listing.city,
        venueCountry: listing.venueCountry,
        url: listing.url,
        notes: listing.note ? [listing.note] : [],
        cuisines: [cuisine],
      });
      continue;
    }
    existing.url ??= listing.url;
    if (listing.note && !existing.notes.includes(listing.note)) {
      existing.notes.push(listing.note);
    }
    if (!existing.cuisines.some((entry) => entry.countryCode === cuisine.countryCode)) {
      existing.cuisines.push(cuisine);
    }
  }
  return [...byKey.values()];
}

/** Strongest match level a venue carries, which sets how it is stored. */
export function bestMatch(venue: SheetVenue): SheetMatchLevel {
  if (venue.cuisines.some((c) => c.match === "country")) return "country";
  if (venue.cuisines.some((c) => c.match === "regional")) return "regional";
  return "inspired";
}
