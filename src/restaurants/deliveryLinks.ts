/** Deep links into NL delivery platforms for a cuisine + optional city.
 *
 * Notes (verified Aug 2026):
 * - Thuisbezorgd.nl (Just Eat Takeaway) uses public SEO paths
 *   `/bestel/{city}/{cuisine}` and `/bestel/indebuurt/{cuisine}`.
 *   There is no public search API for third parties; results need an address
 *   on their site. Cuisine directory: https://www.thuisbezorgd.nl/bestel/indebuurt
 * - Uber Eats has no stable `?q=` search deep link without a saved place (`pl`).
 *   Reliable public pages are `/nl/city/{city-province}` and
 *   `/nl/category/{city-province}/{cuisine}`.
 * - Deliveroo left the Netherlands in Nov 2022; deliveroo.nl redirects to UK.
 * - Thuisbezorgd.nl outbound links are wrapped with Awin when marketing consent
 *   is granted (see affiliateLinks.ts).
 */

import { wrapThuisbezorgdAffiliateUrl } from "./affiliateLinks";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Dutch cuisine path segments used by Thuisbezorgd
 * (`/bestel/{city}/{slug}` or `/bestel/indebuurt/{slug}`).
 * Prefer slugs that appear on /bestel/indebuurt.
 */
export const THUISBEZORGD_CUISINE_SLUG: Record<string, string> = {
  af: "afgaans",
  ar: "argentijns",
  bd: "bengaals",
  br: "braziliaans",
  cn: "chinees",
  de: "duits",
  eg: "egyptisch",
  et: "ethiopisch",
  fr: "frans",
  gr: "grieks",
  id: "indonesisch",
  in: "indiaas",
  ir: "iraans",
  it: "italiaans",
  jp: "japans",
  ke: "afrikaans",
  kr: "koreaans",
  lb: "libanees",
  ma: "marokkaans",
  mx: "mexicaans",
  ng: "afrikaans",
  /** TB lists Dutch as "hollands", not "nederlands". */
  nl: "hollands",
  pl: "pools",
  pt: "portugees",
  sa: "midden-oosters",
  sy: "syrisch",
  th: "thais",
  tr: "turks",
  tw: "chinees",
  us: "amerikaans",
  vn: "vietnamees",
};

/** Uber Eats English cuisine category slugs under /nl/category/.../{slug}. */
export const UBER_CUISINE_SLUG: Record<string, string> = {
  af: "afghan",
  ar: "argentinian",
  br: "brazilian",
  cn: "chinese",
  de: "german",
  eg: "egyptian",
  et: "ethiopian",
  fr: "french",
  gr: "greek",
  id: "indonesian",
  in: "indian",
  ir: "persian",
  it: "italian",
  jp: "japanese",
  ke: "african",
  kr: "korean",
  lb: "lebanese",
  ma: "moroccan",
  mx: "mexican",
  ng: "african",
  nl: "dutch",
  pl: "polish",
  pt: "portuguese",
  sa: "middle-eastern",
  sy: "syrian",
  th: "thai",
  tr: "turkish",
  tw: "taiwanese",
  us: "american",
  vn: "vietnamese",
};

/**
 * Uber Eats city SEO slugs (`city-province`). Used for /nl/city/ and /nl/category/.
 * Unknown cities fall back to Amsterdam (stable national browse hub).
 */
const UBER_CITY_SLUG: Record<string, string> = {
  amsterdam: "amsterdam-noord-holland",
  rotterdam: "rotterdam-zuid-holland",
  "den-haag": "den-haag-zuid-holland",
  "the-hague": "den-haag-zuid-holland",
  "s-gravenhage": "den-haag-zuid-holland",
  gravenhage: "den-haag-zuid-holland",
  utrecht: "utrecht-utrecht",
  eindhoven: "eindhoven-noord-brabant",
  groningen: "groningen-groningen",
  tilburg: "tilburg-noord-brabant",
  almere: "almere-flevoland",
  breda: "breda-noord-brabant",
  nijmegen: "nijmegen-gelderland",
  apeldoorn: "apeldoorn-gelderland",
  haarlem: "haarlem-noord-holland",
  arnhem: "arnhem-gelderland",
  amersfoort: "amersfoort-utrecht",
  zaandam: "zaandam-noord-holland",
  hoofddorp: "hoofddorp-noord-holland",
  maastricht: "maastricht-limburg",
  dordrecht: "dordrecht-zuid-holland",
  leiden: "leiden-zuid-holland",
  zwolle: "zwolle-overijssel",
  zoetermeer: "zoetermeer-zuid-holland",
  delft: "delft-zuid-holland",
  "den-bosch": "den-bosch-noord-brabant",
  "s-hertogenbosch": "den-bosch-noord-brabant",
  hertogenbosch: "den-bosch-noord-brabant",
  enschede: "enschede-overijssel",
  haarlemermeer: "hoofddorp-noord-holland",
};

const DEFAULT_UBER_CITY = "amsterdam-noord-holland";

/** Dutch Thuisbezorgd cuisine path segment for a country code, if known. */
export function thuisbezorgdCuisineSlug(countryCode: string): string | undefined {
  return THUISBEZORGD_CUISINE_SLUG[countryCode.toLowerCase()];
}

/** Uber Eats English cuisine category slug for a country code, if known. */
export function uberCuisineSlug(countryCode: string): string | undefined {
  return UBER_CUISINE_SLUG[countryCode.toLowerCase()];
}

export type DeliveryLinkInput = {
  countryCode: string;
  countryName: string;
  /** Optional NL city or postcode from the dine location preference. */
  cityOrPostcode?: string;
};

/** Active NL browse platforms only (Deliveroo exited NL in 2022). */
export type DeliveryPlatformId = "thuisbezorgd" | "ubereats";

export type DeliveryPlatformLink = {
  id: DeliveryPlatformId;
  href: string;
  searchLabel: string;
};

function citySlug(cityOrPostcode: string | undefined): string | null {
  const raw = cityOrPostcode?.trim() ?? "";
  if (!raw) return null;
  // Postcodes are not valid city slugs on Thuisbezorgd path pages.
  if (/^\d{4}/.test(raw)) return null;
  const slug = slugify(raw);
  return slug || null;
}

function uberCitySlug(cityOrPostcode: string | undefined): string {
  const slug = citySlug(cityOrPostcode);
  if (!slug) return DEFAULT_UBER_CITY;
  return UBER_CITY_SLUG[slug] ?? DEFAULT_UBER_CITY;
}

export function buildThuisbezorgdUrl(input: DeliveryLinkInput): string {
  const code = input.countryCode.toLowerCase();
  const cuisine = THUISBEZORGD_CUISINE_SLUG[code];
  const city = citySlug(input.cityOrPostcode);

  if (cuisine && city) {
    return `https://www.thuisbezorgd.nl/bestel/${city}/${cuisine}`;
  }
  if (cuisine) {
    return `https://www.thuisbezorgd.nl/bestel/indebuurt/${cuisine}`;
  }
  if (city) {
    // City landing — user picks cuisine / enters full address there.
    return `https://www.thuisbezorgd.nl/bestel/${city}`;
  }
  return "https://www.thuisbezorgd.nl/bestel/indebuurt";
}

export function buildUberEatsUrl(input: DeliveryLinkInput): string {
  const code = input.countryCode.toLowerCase();
  const cuisine = UBER_CUISINE_SLUG[code];
  const city = uberCitySlug(input.cityOrPostcode);

  if (cuisine) {
    return `https://www.ubereats.com/nl/category/${city}/${cuisine}`;
  }
  return `https://www.ubereats.com/nl/city/${city}`;
}

export function deliveryPlatformLinks(
  input: DeliveryLinkInput & { marketingAllowed?: boolean },
): DeliveryPlatformLink[] {
  const city = input.cityOrPostcode?.trim() || undefined;
  const cuisine = THUISBEZORGD_CUISINE_SLUG[input.countryCode.toLowerCase()];
  const thuisLabel = cuisine ? input.countryName : city ? city : input.countryName;
  const cityLabel = city ? `${input.countryName} · ${city}` : input.countryName;
  const marketingAllowed = input.marketingAllowed === true;

  return [
    {
      id: "thuisbezorgd",
      href: wrapThuisbezorgdAffiliateUrl(buildThuisbezorgdUrl(input), {
        marketingAllowed,
      }),
      searchLabel: thuisLabel,
    },
    {
      id: "ubereats",
      href: buildUberEatsUrl(input),
      searchLabel: cityLabel,
    },
  ];
}

/** True when a Thuisbezorgd URL matches known public path shapes. */
export function isPlausibleThuisbezorgdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)thuisbezorgd\.nl$/i.test(parsed.hostname)) return false;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    // Real restaurant menus: /menu/{slug} or /en/menu/{slug}
    if (/^\/(en\/)?menu\/[a-z0-9][a-z0-9-]*$/i.test(path)) return true;
    // Cuisine / city browse: /bestel/...
    if (/^\/bestel(\/[a-z0-9-]+)+$/i.test(path)) return true;
    return false;
  } catch {
    return false;
  }
}

/** True when an Uber Eats URL matches known public NL path shapes. */
export function isPlausibleUberEatsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)ubereats\.com$/i.test(parsed.hostname)) return false;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return (
      /^\/nl\/store\/[^/]+\/[^/]+$/i.test(path) ||
      /^\/nl\/category\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(path) ||
      /^\/nl\/city\/[a-z0-9-]+$/i.test(path)
    );
  } catch {
    return false;
  }
}

/**
 * Prefer the stored restaurant URL when it looks real; otherwise fall back to
 * a working cuisine browse page (LLM invents broken TB/Uber deep links).
 */
export function resolveOrderOptionHref(input: {
  platform: string;
  url: string;
  countryCode: string;
  countryName: string;
  cityOrPostcode?: string;
  marketingAllowed?: boolean;
}): string {
  const url = input.url.trim();
  const city = input.cityOrPostcode?.trim() || undefined;
  const browseInput: DeliveryLinkInput = {
    countryCode: input.countryCode,
    countryName: input.countryName,
    cityOrPostcode: city,
  };
  const marketingAllowed = input.marketingAllowed === true;
  const wrapTb = (href: string) =>
    wrapThuisbezorgdAffiliateUrl(href, { marketingAllowed });

  if (input.platform === "thuisbezorgd") {
    return wrapTb(
      isPlausibleThuisbezorgdUrl(url) ? url : buildThuisbezorgdUrl(browseInput),
    );
  }
  if (input.platform === "ubereats") {
    return isPlausibleUberEatsUrl(url) ? url : buildUberEatsUrl(browseInput);
  }
  if (input.platform === "deliveroo" || /deliveroo\./i.test(url)) {
    // Deliveroo left NL — send people to a working platform instead.
    return wrapTb(buildThuisbezorgdUrl(browseInput));
  }
  if (/^https?:\/\//i.test(url)) return url;
  return wrapTb(buildThuisbezorgdUrl(browseInput));
}
