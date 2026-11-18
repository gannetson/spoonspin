/**
 * Where Spoonspin looks for restaurants and delivery options: the Netherlands plus
 * its neighbours Belgium and western Germany. One shared table of regions (for the
 * OSM harvest) and city anchors (for Dine search, delivery hubs and the "which
 * country is this point in" question).
 *
 * "Host country" is where a restaurant physically is (nl / be / de). It is not the
 * cuisine country (`cuisineCodes`), which says what the restaurant serves.
 */

export type HostCountry = "nl" | "be" | "de";

export type Bbox = { south: number; west: number; north: number; east: number };

export type CoverageRegion = {
  id: string;
  name: string;
  bbox: Bbox;
};

/**
 * Rectangles handed to the tile harvest. They overlap at the borders on purpose;
 * tiles are keyed by absolute grid position, so overlap never searches a tile twice.
 */
export const COVERAGE_REGIONS: CoverageRegion[] = [
  { id: "nl", name: "Netherlands", bbox: { south: 50.75, west: 3.2, north: 53.6, east: 7.23 } },
  { id: "be", name: "Belgium", bbox: { south: 49.5, west: 2.5, north: 51.5, east: 6.4 } },
  {
    id: "de-west",
    name: "Western Germany",
    bbox: { south: 50.2, west: 5.85, north: 52.6, east: 8.6 },
  },
];

export function coverageRegions(ids?: string[]): CoverageRegion[] {
  if (!ids || ids.length === 0) return COVERAGE_REGIONS;
  const wanted = new Set(ids.map((id) => id.trim().toLowerCase()));
  const picked = COVERAGE_REGIONS.filter((region) => wanted.has(region.id));
  const unknown = [...wanted].filter((id) => !COVERAGE_REGIONS.some((r) => r.id === id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown region(s): ${unknown.join(", ")}. Use: ${COVERAGE_REGIONS.map((r) => r.id).join(", ")}`,
    );
  }
  return picked;
}

export type CityAnchor = {
  /** Display name, also what we search delivery platforms with. */
  name: string;
  country: HostCountry;
  lat: number;
  lng: number;
  /** Lower-case, accent-free spellings people type. Includes `name`. */
  aliases: string[];
  /** Typical postcode for platforms that want an address. */
  address: string;
};

function anchor(
  name: string,
  country: HostCountry,
  lat: number,
  lng: number,
  address: string,
  ...aliases: string[]
): CityAnchor {
  return { name, country, lat, lng, address, aliases: [normalizeCity(name), ...aliases] };
}

/** Lower-case, strip accents and punctuation: "Düsseldorf" and "dusseldorf" compare equal. */
export function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const CITY_ANCHORS_LIST: CityAnchor[] = [
  // Netherlands: Randstad first (the order delivery jobs run in), then the rest.
  anchor("Leiden", "nl", 52.1601, 4.497, "2312AB Leiden"),
  anchor("Amsterdam", "nl", 52.3676, 4.9041, "1012AB Amsterdam", "ams"),
  anchor("Rotterdam", "nl", 51.9244, 4.4777, "3011AB Rotterdam", "rtm"),
  anchor("Den Haag", "nl", 52.0705, 4.3007, "2511AB Den Haag", "the hague", "hague", "'s-gravenhage", "s-gravenhage", "gravenhage"),
  anchor("Utrecht", "nl", 52.0907, 5.1214, "3511AB Utrecht"),
  anchor("Haarlem", "nl", 52.3874, 4.6462, "2011AB Haarlem"),
  anchor("Delft", "nl", 52.0116, 4.3571, "2611AB Delft"),
  anchor("Eindhoven", "nl", 51.4416, 5.4697, "5611AB Eindhoven"),
  anchor("Groningen", "nl", 53.2194, 6.5665, "9711AB Groningen"),
  anchor("Maastricht", "nl", 50.8514, 5.691, "6211AB Maastricht"),
  anchor("Breda", "nl", 51.5719, 4.7683, "4811AB Breda"),
  anchor("Nijmegen", "nl", 51.8126, 5.8372, "6511AB Nijmegen"),
  anchor("Tilburg", "nl", 51.5555, 5.0913, "5038AB Tilburg"),
  anchor("Arnhem", "nl", 51.9851, 5.8987, "6811AB Arnhem"),
  anchor("Almere", "nl", 52.3508, 5.2647, "1315AB Almere"),
  anchor("Zwolle", "nl", 52.5168, 6.083, "8011AB Zwolle"),
  anchor("Enschede", "nl", 52.2215, 6.8937, "7511AB Enschede"),
  anchor("'s-Hertogenbosch", "nl", 51.6978, 5.3037, "5211AB 's-Hertogenbosch", "den bosch", "s-hertogenbosch"),
  anchor("Venlo", "nl", 51.3704, 6.1724, "5911AB Venlo"),
  anchor("Heerlen", "nl", 50.8882, 5.9795, "6411AB Heerlen"),
  // Belgium
  anchor("Antwerpen", "be", 51.2194, 4.4025, "Meir 1, 2000 Antwerpen", "antwerp", "anvers"),
  anchor("Brussel", "be", 50.8503, 4.3517, "Grote Markt 1, 1000 Brussel", "brussels", "bruxelles"),
  anchor("Gent", "be", 51.0543, 3.7174, "Korenmarkt 1, 9000 Gent", "ghent"),
  anchor("Leuven", "be", 50.8798, 4.7005, "Grote Markt 9, 3000 Leuven", "louvain"),
  anchor("Brugge", "be", 51.2093, 3.2247, "Markt 1, 8000 Brugge", "bruges"),
  anchor("Liège", "be", 50.6326, 5.5797, "Place Saint-Lambert 1, 4000 Liège", "luik"),
  anchor("Mechelen", "be", 51.0259, 4.4777, "Grote Markt 21, 2800 Mechelen"),
  anchor("Hasselt", "be", 50.9307, 5.3325, "Grote Markt 1, 3500 Hasselt"),
  anchor("Kortrijk", "be", 50.8279, 3.2649, "Grote Markt 1, 8500 Kortrijk"),
  anchor("Charleroi", "be", 50.4108, 4.4446, "Place Charles II 1, 6000 Charleroi"),
  anchor("Namur", "be", 50.4674, 4.8719, "Place d'Armes 1, 5000 Namur", "namen"),
  // Western Germany
  anchor("Aachen", "de", 50.7753, 6.0839, "52062 Aachen", "aken"),
  anchor("Köln", "de", 50.9375, 6.9603, "50667 Köln", "cologne", "koeln"),
  anchor("Düsseldorf", "de", 51.2277, 6.7735, "40213 Düsseldorf", "dusseldorf", "duesseldorf"),
  anchor("Duisburg", "de", 51.4344, 6.7623, "47051 Duisburg"),
  anchor("Essen", "de", 51.4556, 7.0116, "45127 Essen"),
  anchor("Dortmund", "de", 51.5136, 7.4653, "44137 Dortmund"),
  anchor("Bonn", "de", 50.7374, 7.0982, "53111 Bonn"),
  anchor("Münster", "de", 51.9607, 7.6261, "48143 Münster", "munster", "muenster"),
  anchor("Mönchengladbach", "de", 51.1805, 6.4428, "41061 Mönchengladbach", "monchengladbach", "moenchengladbach"),
  anchor("Krefeld", "de", 51.3388, 6.5853, "47798 Krefeld"),
  anchor("Bochum", "de", 51.4818, 7.2162, "44787 Bochum"),
  anchor("Wuppertal", "de", 51.2562, 7.1508, "42103 Wuppertal"),
  anchor("Kleve", "de", 51.7889, 6.1386, "47533 Kleve", "cleves"),
];

export function cityAnchorByName(city: string): CityAnchor | undefined {
  const key = normalizeCity(city);
  if (!key) return undefined;
  return CITY_ANCHORS_LIST.find((a) => a.aliases.includes(key));
}

/** First anchor whose name or alias appears in free text ("Antwerp centre", "near Aachen"). */
export function findCityAnchorInText(text: string): CityAnchor | undefined {
  const key = normalizeCity(text);
  if (!key) return undefined;
  const exact = CITY_ANCHORS_LIST.find((a) => a.aliases.includes(key));
  if (exact) return exact;
  return CITY_ANCHORS_LIST.find((a) =>
    a.aliases.some((alias) => alias.length >= 3 && new RegExp(`(^|[^a-z])${escapeRegex(alias)}($|[^a-z])`).test(key)),
  );
}

/** Every anchor whose name or alias appears as a whole word in `text`. */
export function anchorsInText(text: string): CityAnchor[] {
  const key = normalizeCity(text);
  if (!key) return [];
  return CITY_ANCHORS_LIST.filter((a) =>
    a.aliases.some(
      (alias) =>
        alias.length >= 3 &&
        new RegExp(`(^|[^a-z])${escapeRegex(alias)}($|[^a-z])`).test(key),
    ),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestCityAnchor(point: { lat: number; lng: number }): {
  anchor: CityAnchor;
  km: number;
} {
  let best = CITY_ANCHORS_LIST[0]!;
  let bestKm = Infinity;
  for (const candidate of CITY_ANCHORS_LIST) {
    const km = distanceKm(point, candidate);
    if (km < bestKm) {
      best = candidate;
      bestKm = km;
    }
  }
  return { anchor: best, km: bestKm };
}

/**
 * Which country a point is in, judged by the nearest known city. Approximate by
 * design (it needs no border polygons), and good enough because the anchor list is
 * dense around the borders: Aachen, Maastricht, Liège, Kleve and Venlo all sit
 * within a few tens of kilometres of each other.
 */
export function hostCountryForPoint(point: { lat: number; lng: number }): HostCountry | null {
  const { anchor: nearest, km } = nearestCityAnchor(point);
  return km <= 120 ? nearest.country : null;
}

/** Delivery/dine cities per host country, in the order jobs should run. */
export const FILL_CITIES_BY_COUNTRY: Record<HostCountry, string[]> = {
  nl: [
    "Leiden",
    "Amsterdam",
    "Rotterdam",
    "Den Haag",
    "Utrecht",
    "Haarlem",
    "Delft",
    "Eindhoven",
    "Groningen",
    "Maastricht",
    "Breda",
    "Nijmegen",
    "Tilburg",
    "Arnhem",
  ],
  be: ["Antwerpen", "Brussel", "Gent", "Leuven", "Brugge", "Liège"],
  de: ["Aachen", "Köln", "Düsseldorf", "Duisburg", "Essen", "Dortmund", "Bonn", "Münster"],
};

export function hostCountryOfCity(city: string): HostCountry | null {
  return cityAnchorByName(city)?.country ?? null;
}

/**
 * The order in which delivery jobs run: the five Randstad hubs first (Leiden is the
 * default Order city), then the biggest neighbouring cities abroad, then the rest.
 * Jobs run city by city, so a partial run always leaves whole cities finished.
 */
export const FILL_CITIES_ORDERED: string[] = [
  "Leiden",
  "Amsterdam",
  "Rotterdam",
  "Den Haag",
  "Utrecht",
  "Antwerpen",
  "Brussel",
  "Aachen",
  "Köln",
  "Düsseldorf",
  "Gent",
  "Eindhoven",
  "Maastricht",
  "Haarlem",
  "Delft",
  "Groningen",
  "Breda",
  "Nijmegen",
  "Tilburg",
  "Arnhem",
  "Leuven",
  "Brugge",
  "Liège",
  "Duisburg",
  "Essen",
  "Dortmund",
  "Bonn",
  "Münster",
];
