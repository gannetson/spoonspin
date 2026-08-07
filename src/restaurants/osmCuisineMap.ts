/**
 * Maps Spoon Spin country codes to OpenStreetMap `cuisine=*` values.
 * Only specific (primary) tags are used to assign a country — broad tags
 * like "asian" or "african" are too noisy for specialty search.
 */
export const OSM_CUISINE_BY_COUNTRY: Record<string, string[]> = {
  nl: ["dutch"],
  bg: ["bulgarian"],
  ge: ["georgian"],
  it: ["italian", "pasta"],
  es: ["spanish", "tapas"],
  gr: ["greek"],
  tr: ["turkish"],
  lb: ["lebanese"],
  ma: ["moroccan"],
  et: ["ethiopian", "eritrea", "east_african"],
  sn: ["senegalese"],
  za: ["south_african"],
  in: ["indian"],
  id: ["indonesian"],
  vn: ["vietnamese"],
  jp: ["japanese", "sushi", "ramen"],
  mx: ["mexican"],
  pe: ["peruvian"],
  br: ["brazilian"],
  jm: ["jamaican"],
  fr: ["french"],
  de: ["german"],
  th: ["thai"],
  kr: ["korean"],
  cn: ["chinese"],
  pt: ["portuguese"],
  ar: ["argentinian", "argentine"],
  ng: ["nigerian"],
  eg: ["egyptian"],
  ph: ["filipino"],
  af: ["afghan"],
  al: ["albanian"],
  dz: ["algerian"],
  am: ["armenian"],
  au: ["australian"],
  at: ["austrian"],
  az: ["azerbaijani"],
  bd: ["bangladeshi"],
  be: ["belgian"],
  ba: ["bosnian"],
  kh: ["cambodian"],
  ca: ["canadian"],
  cl: ["chilean"],
  co: ["colombian"],
  hr: ["croatian"],
  cu: ["cuban"],
  cz: ["czech"],
  dk: ["danish"],
  fi: ["finnish"],
  gh: ["ghanaian"],
  hu: ["hungarian"],
  ir: ["iranian", "persian"],
  iq: ["iraqi"],
  ie: ["irish"],
  il: ["israeli"],
  ke: ["kenyan"],
  my: ["malaysian"],
  np: ["nepalese", "nepali"],
  no: ["norwegian"],
  pk: ["pakistani"],
  pl: ["polish"],
  ro: ["romanian"],
  ru: ["russian"],
  rs: ["serbian"],
  sg: ["singaporean"],
  sk: ["slovak"],
  si: ["slovenian"],
  se: ["swedish"],
  ch: ["swiss"],
  sy: ["syrian"],
  tw: ["taiwanese"],
  tz: ["tanzanian"],
  ua: ["ukrainian"],
  gb: ["british"],
  us: ["american"],
  uz: ["uzbek"],
  ve: ["venezuelan"],
  by: ["belarusian"],
  bo: ["bolivian"],
  cy: ["cypriot"],
  do: ["dominican"],
  er: ["eritrean"],
  jo: ["jordanian"],
  la: ["lao", "laos"],
  ly: ["libyan"],
  mt: ["maltese"],
  ec: ["ecuadorian"],
};

/** Tags that are too broad to assign a country by themselves. */
export const WEAK_OSM_CUISINE_TAGS = new Set([
  "asian",
  "african",
  "west_african",
  "east_african",
  "middle_eastern",
  "mediterranean",
  "latin_american",
  "caribbean",
  "european",
  "international",
  "regional",
  "pizza",
  "kebab",
  "burger",
  "steak_house",
  "grill",
  "barbecue",
  "cafe",
  "coffee_shop",
  "seafood",
]);

export function osmTagsForCountry(code: string): string[] {
  return OSM_CUISINE_BY_COUNTRY[code.toLowerCase()] ?? [];
}

export function countryCodesForOsmCuisineTag(tag: string): string[] {
  const normalized = tag.trim().toLowerCase();
  if (WEAK_OSM_CUISINE_TAGS.has(normalized)) return [];
  const codes: string[] = [];
  for (const [code, tags] of Object.entries(OSM_CUISINE_BY_COUNTRY)) {
    if (tags.includes(normalized)) codes.push(code);
  }
  return codes;
}

/** Assign country codes only from specific cuisine tags present on the place. */
export function countryCodesFromOsmTags(tags: string[]): string[] {
  const codes = new Set<string>();
  for (const tag of tags) {
    for (const code of countryCodesForOsmCuisineTag(tag)) {
      codes.add(code);
    }
  }
  return Array.from(codes);
}

export function hasPrimaryCuisineMatch(
  countryCode: string,
  cuisineTags: string[],
): boolean {
  const primary = osmTagsForCountry(countryCode);
  if (primary.length === 0) return false;
  const normalized = new Set(cuisineTags.map((t) => t.trim().toLowerCase()));
  return primary.some((tag) => normalized.has(tag));
}
