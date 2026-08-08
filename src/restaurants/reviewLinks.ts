import {
  RATING_SOURCE_LABELS,
  type RatingSourceId,
  type RestaurantRatings,
} from "./ratings";

export type ReviewLink = {
  source: RatingSourceId;
  label: string;
  href: string;
};

const REVIEW_LINK_ORDER: RatingSourceId[] = [
  "google",
  "tripadvisor",
  "theFork",
  "openTable",
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2)
    .filter(
      (token) =>
        ![
          "the",
          "and",
          "restaurant",
          "cafe",
          "café",
          "bistro",
          "grill",
          "kitchen",
          "bar",
          "hotel",
        ].includes(token),
    );
}

/** True when enough name tokens appear in the URL path. */
export function urlMatchesRestaurantName(url: string, name: string): boolean {
  const tokens = significantTokens(name);
  if (tokens.length === 0) return false;
  const haystack = normalize(decodeURIComponent(url)).replace(/\s+/g, "");
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits / tokens.length >= 0.5;
}

const CITY_ALIASES: Record<string, string[]> = {
  denhaag: ["denhaag", "thehague", "sgravenhage"],
  sgravenhage: ["denhaag", "thehague", "sgravenhage"],
  thehague: ["denhaag", "thehague", "sgravenhage"],
  shertogenbosch: ["shertogenbosch", "denbosch", "bosch"],
  denbosch: ["shertogenbosch", "denbosch", "bosch"],
};

export function urlMentionsCity(url: string, city: string): boolean {
  const cityNorm = normalize(city).replace(/\s+/g, "");
  if (!cityNorm || cityNorm.length < 3) return true;
  const haystack = normalize(decodeURIComponent(url)).replace(/\s+/g, "");
  const aliases = CITY_ALIASES[cityNorm] ?? [cityNorm];
  return aliases.some((alias) => haystack.includes(alias));
}

export function isTripadvisorRestaurantUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)tripadvisor\./i.test(parsed.hostname) &&
      /\/Restaurant_Review-/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function isTheForkRestaurantUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)thefork\./i.test(parsed.hostname) &&
      /\/restaurant\/[a-z0-9-]+-r\d+/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function isOpenTableRestaurantUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)opentable\./i.test(parsed.hostname)) return false;
    return (
      /\/r\//i.test(parsed.pathname) ||
      /\/restaurant\/profile\/\d+/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function isGoogleMapsPlaceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)google\./i.test(parsed.hostname) ||
      parsed.hostname === "maps.app.goo.gl"
    );
  } catch {
    return false;
  }
}

function cleanUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_|cc$|rwg_token$|g_mp$)/i.test(key) || key === "utm_source") {
      parsed.searchParams.delete(key);
    }
  }

  // Normalize Tripadvisor review/pagination URLs to the restaurant profile.
  if (/(^|\.)tripadvisor\./i.test(parsed.hostname)) {
    const showUser = parsed.pathname.match(
      /\/ShowUserReviews-(g\d+)-(d\d+)-r\d+-(.+)$/i,
    );
    if (showUser) {
      parsed.pathname = `/Restaurant_Review-${showUser[1]}-${showUser[2]}-Reviews-${showUser[3]}`;
    }
    parsed.pathname = parsed.pathname.replace(/-or\d+-/i, "-");
  }

  // The Fork review subpaths → restaurant page.
  if (/(^|\.)thefork\./i.test(parsed.hostname)) {
    parsed.pathname = parsed.pathname.replace(/\/(avis|reviews|menu)\/?$/i, "");
  }

  return parsed.toString().replace(/\?$/, "");
}

/**
 * Pick the best profile URL for a platform from web-search source URLs.
 * Rejects listing/search pages and weak name matches.
 */
export function pickReviewProfileUrl(
  source: Exclude<RatingSourceId, "google">,
  candidates: string[],
  restaurant: { name: string; city: string },
): string | null {
  const matcher =
    source === "tripadvisor"
      ? isTripadvisorRestaurantUrl
      : source === "theFork"
        ? isTheForkRestaurantUrl
        : isOpenTableRestaurantUrl;

  const preferredHost =
    source === "tripadvisor"
      ? /tripadvisor\.nl$/i
      : source === "theFork"
        ? /thefork\.nl$/i
        : /opentable\.nl$/i;

  const ranked = candidates
    .map((raw) => {
      try {
        return cleanUrl(raw);
      } catch {
        return null;
      }
    })
    .filter((url): url is string => Boolean(url))
    .filter((url) => matcher(url))
    .filter((url) => urlMatchesRestaurantName(url, restaurant.name))
    .filter((url) => urlMentionsCity(url, restaurant.city) || source === "theFork")
    .sort((a, b) => {
      const aPref = preferredHost.test(new URL(a).hostname) ? 0 : 1;
      const bPref = preferredHost.test(new URL(b).hostname) ? 0 : 1;
      return aPref - bPref || a.length - b.length;
    });

  const best = ranked[0];
  if (!best) return null;

  // Prefer NL locales when the listing ID is shared across markets.
  try {
    const parsed = new URL(best);
    if (source === "tripadvisor") parsed.hostname = "www.tripadvisor.nl";
    if (source === "theFork") parsed.hostname = "www.thefork.nl";
    if (source === "openTable") parsed.hostname = "www.opentable.nl";
    return parsed.toString().replace(/\?$/, "");
  } catch {
    return best;
  }
}

/**
 * Review-site links for cards/detail — only real stored profile URLs.
 * Never invents search-page fallbacks.
 */
export function listReviewLinks(input: {
  name: string;
  city: string;
  ratings?: RestaurantRatings | null;
  mapsUrl?: string;
}): ReviewLink[] {
  const links: ReviewLink[] = [];
  const ratings = input.ratings ?? {};

  for (const source of REVIEW_LINK_ORDER) {
    const stored = ratings[source]?.url?.trim();
    let href = stored || null;

    if (source === "google" && !href && input.mapsUrl?.trim()) {
      href = input.mapsUrl.trim();
    }
    if (!href) continue;

    if (source === "google" && !isGoogleMapsPlaceUrl(href)) continue;
    if (source === "tripadvisor" && !isTripadvisorRestaurantUrl(href)) continue;
    if (source === "theFork" && !isTheForkRestaurantUrl(href)) continue;
    if (source === "openTable" && !isOpenTableRestaurantUrl(href)) continue;
    if (
      source !== "google" &&
      !urlMatchesRestaurantName(href, input.name)
    ) {
      continue;
    }

    links.push({
      source,
      label: RATING_SOURCE_LABELS[source],
      href,
    });
  }

  return links;
}
