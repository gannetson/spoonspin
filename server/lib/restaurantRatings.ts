/**
 * Guest ratings from Google Places and Tripadvisor, shared by the `agent:ratings`
 * script and the per-restaurant enrichment, so a freshly promoted restaurant gets its
 * rating in the same pass as its photo, text and menu.
 */
import { hostCountryForPoint, type HostCountry } from "../../src/restaurants/coverage.ts";
import {
  aggregateGuestRating,
  type SourceRating,
} from "../../src/restaurants/ratings.ts";
import {
  getRestaurantById,
  upsertRestaurant,
  type StoredRestaurant,
} from "../db/restaurants.ts";

const HOST_COUNTRY_LABEL: Record<HostCountry, string> = {
  nl: "Netherlands",
  be: "Belgium",
  de: "Germany",
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 2));
  const rightTokens = right.split(" ").filter((t) => t.length > 2);
  if (rightTokens.length === 0) return false;
  const overlap = rightTokens.filter((t) => leftTokens.has(t)).length;
  return overlap / rightTokens.length >= 0.6;
}

export async function fetchGoogleRating(
  place: Pick<StoredRestaurant, "name" | "city" | "lat" | "lng">,
  apiKey: string,
): Promise<SourceRating | null> {
  const host = hostCountryForPoint(place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : { lat: NaN, lng: NaN }) ?? "nl";
  const textQuery = `${place.name} restaurant ${place.city} ${HOST_COUNTRY_LABEL[host]}`;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      regionCode: host.toUpperCase(),
      maxResultCount: 5,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places ${response.status}: ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      formattedAddress?: string;
    }>;
  };

  const match = (data.places ?? []).find((candidate) =>
    namesLikelyMatch(place.name, candidate.displayName?.text ?? ""),
  );
  if (!match?.rating) return null;

  return {
    score: match.rating,
    count: match.userRatingCount,
    scale: 5,
    url: match.googleMapsUri,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchTripadvisorRating(
  place: Pick<StoredRestaurant, "name" | "city" | "lat" | "lng">,
  apiKey: string,
): Promise<SourceRating | null> {
  const url = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("searchQuery", `${place.name} ${place.city}`);
  url.searchParams.set("category", "restaurants");
  url.searchParams.set("language", "en");
  if (place.lat != null && place.lng != null) {
    url.searchParams.set("latLong", `${place.lat},${place.lng}`);
  }

  const searchResponse = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!searchResponse.ok) {
    const body = await searchResponse.text();
    throw new Error(`Tripadvisor search ${searchResponse.status}: ${body.slice(0, 180)}`);
  }

  const searchData = (await searchResponse.json()) as {
    data?: Array<{ location_id?: string; name?: string }>;
  };
  const hit = (searchData.data ?? []).find((candidate) =>
    namesLikelyMatch(place.name, candidate.name ?? ""),
  );
  if (!hit?.location_id) return null;

  const detailsUrl = new URL(
    `https://api.content.tripadvisor.com/api/v1/location/${hit.location_id}/details`,
  );
  detailsUrl.searchParams.set("key", apiKey);
  detailsUrl.searchParams.set("language", "en");
  detailsUrl.searchParams.set("currency", "EUR");

  const detailsResponse = await fetch(detailsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!detailsResponse.ok) {
    const body = await detailsResponse.text();
    throw new Error(
      `Tripadvisor details ${detailsResponse.status}: ${body.slice(0, 180)}`,
    );
  }

  const details = (await detailsResponse.json()) as {
    rating?: string | number;
    num_reviews?: string | number;
    web_url?: string;
  };

  const score = Number(details.rating);
  if (!Number.isFinite(score) || score <= 0) return null;

  return {
    score,
    count: Number(details.num_reviews) || undefined,
    scale: 5,
    url: details.web_url,
    fetchedAt: new Date().toISOString(),
  };
}


export function isRatingsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.TRIPADVISOR_API_KEY?.trim(),
  );
}

/**
 * Look up Google and Tripadvisor ratings for one restaurant and store them next to
 * whatever ratings it already has. A missing key or a failed lookup leaves that
 * source untouched; returns which sources produced a rating.
 */
export async function enrichRestaurantRatings(
  restaurantId: string,
): Promise<{ google: boolean; tripadvisor: boolean }> {
  const googleKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const tripadvisorKey = process.env.TRIPADVISOR_API_KEY?.trim();
  const hit = { google: false, tripadvisor: false };
  if (!googleKey && !tripadvisorKey) return hit;

  const place = await getRestaurantById(restaurantId);
  if (!place) return hit;
  const ratings = { ...(place.ratings ?? {}) };

  if (googleKey) {
    try {
      const google = await fetchGoogleRating(place, googleKey);
      if (google) {
        ratings.google = google;
        hit.google = true;
      }
    } catch (error) {
      console.warn(`[ratings] Google failed ${restaurantId}`, error);
    }
  }
  if (tripadvisorKey) {
    try {
      const tripadvisor = await fetchTripadvisorRating(place, tripadvisorKey);
      if (tripadvisor) {
        ratings.tripadvisor = tripadvisor;
        hit.tripadvisor = true;
      }
    } catch (error) {
      console.warn(`[ratings] Tripadvisor failed ${restaurantId}`, error);
    }
  }
  if (!hit.google && !hit.tripadvisor) return hit;

  const aggregated = aggregateGuestRating(ratings);
  await upsertRestaurant({
    ...place,
    ratings,
    userRating: aggregated.rating ?? null,
    reviewCount: aggregated.reviewCount ?? null,
  });
  return hit;
}

export type { SourceRating };
