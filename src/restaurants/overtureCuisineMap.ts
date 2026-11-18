/**
 * Maps Overture Maps place categories (taxonomy ids like `korean_restaurant`) to Spoon
 * Spin cuisine countries.
 *
 * Same rule as the OSM map: only categories that name one country's cuisine count.
 * Broad ones (`asian_restaurant`, `pizza_restaurant`, `doner_kebab_restaurant`,
 * `mediterranean_restaurant`, `burger_restaurant` ...) say too little to assign a
 * country and are left out on purpose. A category that is not listed is simply ignored,
 * so a new Overture category can never create a wrong match, only a missed one.
 */
import { osmTagsForCountry } from "./osmCuisineMap.ts";

export const OVERTURE_CUISINE_BY_CATEGORY: Record<string, string> = {
  afghan_restaurant: "af",
  albanian_restaurant: "al",
  algerian_restaurant: "dz",
  american_restaurant: "us",
  argentine_restaurant: "ar",
  armenian_restaurant: "am",
  australian_restaurant: "au",
  austrian_restaurant: "at",
  azerbaijani_restaurant: "az",
  bangladeshi_restaurant: "bd",
  belarusian_restaurant: "by",
  belgian_restaurant: "be",
  bolivian_restaurant: "bo",
  bosnian_restaurant: "ba",
  brazilian_restaurant: "br",
  british_restaurant: "gb",
  bulgarian_restaurant: "bg",
  cambodian_restaurant: "kh",
  canadian_restaurant: "ca",
  chilean_restaurant: "cl",
  chinese_restaurant: "cn",
  cantonese_restaurant: "cn",
  szechuan_restaurant: "cn",
  sichuan_restaurant: "cn",
  dim_sum_restaurant: "cn",
  hot_pot_restaurant: "cn",
  shanghainese_restaurant: "cn",
  colombian_restaurant: "co",
  croatian_restaurant: "hr",
  cuban_restaurant: "cu",
  cypriot_restaurant: "cy",
  czech_restaurant: "cz",
  danish_restaurant: "dk",
  dominican_restaurant: "do",
  dutch_restaurant: "nl",
  ecuadorian_restaurant: "ec",
  egyptian_restaurant: "eg",
  eritrean_restaurant: "er",
  ethiopian_restaurant: "et",
  filipino_restaurant: "ph",
  finnish_restaurant: "fi",
  french_restaurant: "fr",
  georgian_restaurant: "ge",
  german_restaurant: "de",
  ghanaian_restaurant: "gh",
  greek_restaurant: "gr",
  hungarian_restaurant: "hu",
  indian_restaurant: "in",
  north_indian_restaurant: "in",
  south_indian_restaurant: "in",
  indonesian_restaurant: "id",
  iranian_restaurant: "ir",
  persian_restaurant: "ir",
  iraqi_restaurant: "iq",
  irish_restaurant: "ie",
  israeli_restaurant: "il",
  italian_restaurant: "it",
  jamaican_restaurant: "jm",
  japanese_restaurant: "jp",
  sushi_restaurant: "jp",
  ramen_restaurant: "jp",
  teppanyaki_restaurant: "jp",
  izakaya: "jp",
  jordanian_restaurant: "jo",
  kenyan_restaurant: "ke",
  korean_restaurant: "kr",
  korean_barbecue_restaurant: "kr",
  lao_restaurant: "la",
  laotian_restaurant: "la",
  lebanese_restaurant: "lb",
  libyan_restaurant: "ly",
  malaysian_restaurant: "my",
  maltese_restaurant: "mt",
  mexican_restaurant: "mx",
  moroccan_restaurant: "ma",
  nepalese_restaurant: "np",
  nigerian_restaurant: "ng",
  norwegian_restaurant: "no",
  pakistani_restaurant: "pk",
  peruvian_restaurant: "pe",
  polish_restaurant: "pl",
  portuguese_restaurant: "pt",
  romanian_restaurant: "ro",
  russian_restaurant: "ru",
  senegalese_restaurant: "sn",
  serbian_restaurant: "rs",
  singaporean_restaurant: "sg",
  slovak_restaurant: "sk",
  slovenian_restaurant: "si",
  south_african_restaurant: "za",
  spanish_restaurant: "es",
  tapas_restaurant: "es",
  swedish_restaurant: "se",
  swiss_restaurant: "ch",
  syrian_restaurant: "sy",
  taiwanese_restaurant: "tw",
  tanzanian_restaurant: "tz",
  thai_restaurant: "th",
  turkish_restaurant: "tr",
  ukrainian_restaurant: "ua",
  uzbek_restaurant: "uz",
  venezuelan_restaurant: "ve",
  vietnamese_restaurant: "vn",
};

/** Every category we map, for the query's WHERE clause. */
export const OVERTURE_CUISINE_CATEGORIES: string[] = Object.keys(
  OVERTURE_CUISINE_BY_CATEGORY,
);

/** The specific OSM tag a country's places carry, so an Overture row passes the same promotion rule. */
export function osmTagForCountry(code: string): string | undefined {
  return osmTagsForCountry(code)[0];
}

/**
 * Country codes for a place from all of its categories (primary first). Duplicates are
 * removed and codes with no OSM tag are dropped, because promotion needs one.
 */
export function overtureCuisineCodes(
  categories: Array<string | null | undefined>,
): string[] {
  const codes: string[] = [];
  for (const category of categories) {
    const code = category
      ? OVERTURE_CUISINE_BY_CATEGORY[category.trim().toLowerCase()]
      : undefined;
    if (code && osmTagForCountry(code) && !codes.includes(code)) codes.push(code);
  }
  return codes;
}
