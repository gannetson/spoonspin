/**
 * Maps Google Places (New) `primaryType` / `types` values onto Spoon Spin
 * country codes.
 *
 * Places returns a rich cuisine vocabulary (`turkish_restaurant`,
 * `moroccan_restaurant`, `persian_restaurant`, …) that discovery used to throw
 * away. It is the cheapest reliable answer to "is this place actually serving
 * the cuisine we searched for?", because Google derives it from the venue's own
 * profile rather than from our query.
 *
 * Two kinds of signal live here:
 *
 * - **Specific types** name one country. When a specific type disagrees with the
 *   searched country the candidate is almost always wrong for that search — and
 *   the type says where it belongs instead, which drives reassignment.
 * - **Broad types** (`middle_eastern_restaurant`, `eastern_european_restaurant`)
 *   name a region. They can never confirm a country, but a region that clearly
 *   excludes the searched country is still evidence against it.
 */

/** Google place types that identify exactly one national cuisine. */
export const COUNTRY_BY_PLACE_TYPE: Record<string, string> = {
  afghani_restaurant: "af",
  american_restaurant: "us",
  argentinian_restaurant: "ar",
  armenian_restaurant: "am",
  australian_restaurant: "au",
  austrian_restaurant: "at",
  bangladeshi_restaurant: "bd",
  belgian_restaurant: "be",
  brazilian_restaurant: "br",
  british_restaurant: "gb",
  bulgarian_restaurant: "bg",
  burmese_restaurant: "mm",
  cambodian_restaurant: "kh",
  canadian_restaurant: "ca",
  chilean_restaurant: "cl",
  chinese_restaurant: "cn",
  colombian_restaurant: "co",
  croatian_restaurant: "hr",
  cuban_restaurant: "cu",
  czech_restaurant: "cz",
  danish_restaurant: "dk",
  dutch_restaurant: "nl",
  egyptian_restaurant: "eg",
  ethiopian_restaurant: "et",
  filipino_restaurant: "ph",
  finnish_restaurant: "fi",
  fondue_restaurant: "ch",
  french_restaurant: "fr",
  georgian_restaurant: "ge",
  german_restaurant: "de",
  greek_restaurant: "gr",
  hungarian_restaurant: "hu",
  indian_restaurant: "in",
  indonesian_restaurant: "id",
  irish_pub: "ie",
  irish_restaurant: "ie",
  israeli_restaurant: "il",
  italian_restaurant: "it",
  jamaican_restaurant: "jm",
  japanese_restaurant: "jp",
  korean_barbecue_restaurant: "kr",
  korean_restaurant: "kr",
  lebanese_restaurant: "lb",
  malaysian_restaurant: "my",
  mexican_restaurant: "mx",
  mongolian_restaurant: "mn",
  moroccan_restaurant: "ma",
  nepalese_restaurant: "np",
  nigerian_restaurant: "ng",
  pakistani_restaurant: "pk",
  persian_restaurant: "ir",
  peruvian_restaurant: "pe",
  polish_restaurant: "pl",
  portuguese_restaurant: "pt",
  ramen_restaurant: "jp",
  romanian_restaurant: "ro",
  russian_restaurant: "ru",
  serbian_restaurant: "rs",
  spanish_restaurant: "es",
  sri_lankan_restaurant: "lk",
  surinamese_restaurant: "sr",
  sushi_restaurant: "jp",
  swedish_restaurant: "se",
  swiss_restaurant: "ch",
  syrian_restaurant: "sy",
  taiwanese_restaurant: "tw",
  tapas_restaurant: "es",
  thai_restaurant: "th",
  turkish_restaurant: "tr",
  ukrainian_restaurant: "ua",
  vietnamese_restaurant: "vn",
};

/**
 * Broad regional types and the countries they plausibly cover. A place tagged
 * `eastern_european_restaurant` may well be Armenian; it is certainly not Thai.
 */
export const COUNTRIES_BY_BROAD_PLACE_TYPE: Record<string, string[]> = {
  african_restaurant: [
    "dz",
    "ao",
    "bj",
    "bw",
    "bf",
    "bi",
    "cm",
    "cv",
    "cf",
    "td",
    "km",
    "cg",
    "cd",
    "ci",
    "dj",
    "eg",
    "gq",
    "er",
    "sz",
    "et",
    "ga",
    "gm",
    "gh",
    "gn",
    "gw",
    "ke",
    "ls",
    "lr",
    "ly",
    "mg",
    "mw",
    "ml",
    "mr",
    "mu",
    "ma",
    "mz",
    "na",
    "ne",
    "ng",
    "rw",
    "st",
    "sn",
    "sc",
    "sl",
    "so",
    "za",
    "ss",
    "sd",
    "tz",
    "tg",
    "tn",
    "ug",
    "zm",
    "zw",
  ],
  asian_fusion_restaurant: [
    "af",
    "bd",
    "bt",
    "bn",
    "kh",
    "cn",
    "in",
    "id",
    "jp",
    "kz",
    "kp",
    "kr",
    "kg",
    "la",
    "my",
    "mn",
    "mm",
    "np",
    "pk",
    "ph",
    "sg",
    "lk",
    "tw",
    "tj",
    "th",
    "tl",
    "tm",
    "uz",
    "vn",
  ],
  asian_restaurant: [
    "af",
    "bd",
    "bt",
    "bn",
    "kh",
    "cn",
    "in",
    "id",
    "jp",
    "kz",
    "kp",
    "kr",
    "kg",
    "la",
    "my",
    "mn",
    "mm",
    "np",
    "pk",
    "ph",
    "sg",
    "lk",
    "tw",
    "tj",
    "th",
    "tl",
    "tm",
    "uz",
    "vn",
  ],
  caribbean_restaurant: [
    "ag",
    "bs",
    "bb",
    "bz",
    "cu",
    "dm",
    "do",
    "gd",
    "gy",
    "ht",
    "jm",
    "kn",
    "lc",
    "vc",
    "sr",
    "tt",
  ],
  eastern_european_restaurant: [
    "al",
    "am",
    "az",
    "by",
    "ba",
    "bg",
    "hr",
    "cz",
    "ee",
    "ge",
    "hu",
    "xk",
    "lv",
    "lt",
    "md",
    "me",
    "mk",
    "pl",
    "ro",
    "rs",
    "sk",
    "si",
    "ua",
    "ru",
  ],
  european_restaurant: [
    "ad",
    "al",
    "at",
    "by",
    "be",
    "ba",
    "bg",
    "hr",
    "cy",
    "cz",
    "dk",
    "ee",
    "fi",
    "fr",
    "de",
    "gr",
    "hu",
    "is",
    "ie",
    "it",
    "xk",
    "lv",
    "li",
    "lt",
    "lu",
    "mt",
    "md",
    "mc",
    "me",
    "nl",
    "mk",
    "no",
    "pl",
    "pt",
    "ro",
    "rs",
    "sk",
    "si",
    "es",
    "se",
    "ch",
    "ua",
    "gb",
    "ru",
    "va",
    "sm",
  ],
  latin_american_restaurant: [
    "ar",
    "bo",
    "br",
    "cl",
    "co",
    "cr",
    "cu",
    "do",
    "ec",
    "sv",
    "gt",
    "hn",
    "mx",
    "ni",
    "pa",
    "py",
    "pe",
    "uy",
    "ve",
  ],
  mediterranean_restaurant: [
    "al",
    "dz",
    "ba",
    "hr",
    "cy",
    "eg",
    "fr",
    "gr",
    "il",
    "it",
    "lb",
    "ly",
    "mt",
    "mc",
    "me",
    "ma",
    "ps",
    "si",
    "es",
    "sy",
    "tn",
    "tr",
  ],
  middle_eastern_restaurant: [
    "am",
    "az",
    "bh",
    "cy",
    "eg",
    "ge",
    "ir",
    "iq",
    "il",
    "jo",
    "kw",
    "lb",
    "om",
    "ps",
    "qa",
    "sa",
    "sy",
    "tr",
    "ae",
    "ye",
  ],
  scandinavian_restaurant: ["dk", "fi", "is", "no", "se"],
  south_american_restaurant: [
    "ar",
    "bo",
    "br",
    "cl",
    "co",
    "ec",
    "gy",
    "py",
    "pe",
    "sr",
    "uy",
    "ve",
  ],
  western_restaurant: ["us", "gb", "ca", "au", "nz", "ie"],
};

export type PlaceTypeVerdict =
  /** A specific type naming exactly the searched country. */
  | { kind: "match"; type: string }
  /** The primary type names another country — where the venue likely belongs. */
  | { kind: "mismatch"; type: string; codes: string[] }
  /** A regional type that covers the searched country. */
  | { kind: "region"; type: string }
  /** A regional type that excludes the searched country. */
  | { kind: "region-mismatch"; type: string }
  | { kind: "neutral" };

/**
 * Judge a candidate's Google types against the searched country.
 *
 * The two lists are not equally trustworthy, so they are used asymmetrically:
 *
 * - **Confirming** reads the whole `types` list. Any mention of the searched
 *   cuisine is good enough, and a match always beats a mismatch, because venues
 *   legitimately carry several cuisine types.
 * - **Condemning** reads only `primaryType` — Google's single best guess. The
 *   `types` tail is a grab-bag: an Amsterdam Middle Eastern place lists
 *   `british_restaurant` ninth of fifteen, which is no reason to file it under
 *   the United Kingdom.
 */
export function placeTypeVerdict(
  searchCode: string,
  place: { primaryType?: string; types?: string[] } | string[] | undefined,
): PlaceTypeVerdict {
  const code = searchCode.trim().toLowerCase();
  const input = Array.isArray(place) ? { types: place } : (place ?? {});
  const clean = (value: string | undefined) => value?.trim().toLowerCase() || undefined;
  const primaryType = clean(input.primaryType);
  const types = (input.types ?? [])
    .map((type) => clean(type))
    .filter((type): type is string => Boolean(type));

  const all = [...(primaryType ? [primaryType] : []), ...types];
  if (all.length === 0) return { kind: "neutral" };

  // Confirmation may come from anywhere in the list.
  const confirming = all.find((type) => COUNTRY_BY_PLACE_TYPE[type] === code);
  if (confirming) return { kind: "match", type: confirming };

  // Only the primary type may condemn. Without one, fall back to the first
  // specific type in the list, which is the closest stand-in Google gives us.
  const deciding =
    primaryType ??
    types.find(
      (type) => COUNTRY_BY_PLACE_TYPE[type] ?? COUNTRIES_BY_BROAD_PLACE_TYPE[type],
    );
  if (!deciding) return { kind: "neutral" };

  const specific = COUNTRY_BY_PLACE_TYPE[deciding];
  if (specific) return { kind: "mismatch", type: deciding, codes: [specific] };

  const broad = COUNTRIES_BY_BROAD_PLACE_TYPE[deciding];
  if (broad) {
    return broad.includes(code)
      ? { kind: "region", type: deciding }
      : { kind: "region-mismatch", type: deciding };
  }

  return { kind: "neutral" };
}

/** Human-readable label for a Google place type ("turkish_restaurant" → "Turkish restaurant"). */
export function placeTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
