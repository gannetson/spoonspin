import type { Restaurant, RestaurantSearchParams } from "./types";

export function buildMapsSearchUrl(params: RestaurantSearchParams): string {
  const locationPart = params.cityOrPostcode?.trim()
    ? `${params.cityOrPostcode.trim()}, Netherlands`
    : "Netherlands";
  const query = `${params.countryName} restaurant ${locationPart}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** goo.gl / Firebase Dynamic Links short maps URLs are often dead. */
export function isUnstableMapsShortUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "goo.gl" ||
      host.endsWith(".goo.gl") ||
      host === "g.co" ||
      host === "maps.app.goo.gl"
    );
  } catch {
    return true;
  }
}

export function mapsSearchUrlForPlace(parts: {
  name: string;
  address?: string;
  city?: string;
}): string {
  const query = [parts.name, parts.address, parts.city, "Netherlands"]
    .filter((part) => Boolean(part?.trim()))
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Prefer a real Maps URL; replace dead short links with a search URL. */
export function stableMapsUrl(
  url: string | null | undefined,
  place: { name: string; address?: string; city?: string },
): string {
  if (url?.trim() && /^https?:\/\//i.test(url) && !isUnstableMapsShortUrl(url)) {
    return url.trim();
  }
  return mapsSearchUrlForPlace(place);
}

export function dedupeRestaurantsByPlaceId(restaurants: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const unique: Restaurant[] = [];
  for (const restaurant of restaurants) {
    if (seen.has(restaurant.id)) continue;
    seen.add(restaurant.id);
    unique.push(restaurant);
  }
  return unique;
}
