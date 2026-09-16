/**
 * Google Places as SpoonSpin's canonical restaurant identity layer.
 *
 * Reuses Text Search helpers in googlePlacesLookup.ts and adds Place Details
 * (New) for durable place-id lookups and content refresh.
 *
 * Storage policy (Google Maps Platform Terms):
 * - Place IDs may be stored indefinitely (refresh recommended if >12 months).
 * - Other Places content must not be cached indefinitely — we track
 *   `places_refreshed_at` and refresh on a soft TTL (see config).
 */

import type { PriceLevel } from "../../src/restaurants/types.ts";
import { PLACES_CONTENT_REFRESH_MS } from "../reservations/config.ts";
import {
  getGooglePlacesApiKey,
  isGooglePlacesConfigured,
} from "./googlePlacesPhoto.ts";
import {
  extractCity,
  lookupGoogleRestaurant,
  namesLikelyMatch,
  normalizeName,
  officialWebsiteOrUndefined,
  searchGoogleRestaurantsByCuisine,
  searchGoogleRestaurantsByQuery,
  type GooglePlaceMatch,
  type GroundedPlace,
} from "./googlePlacesLookup.ts";

export {
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
  searchGoogleRestaurantsByCuisine,
  searchGoogleRestaurantsByQuery,
};
export type { GooglePlaceMatch, GroundedPlace };

export type PlacesRestaurantDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  address: string;
  city: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  mapsUrl?: string;
  phone?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  priceLevel?: PriceLevel;
  rating?: number;
  reviewCount?: number;
  fetchedAt: string;
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
};

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "websiteUri",
  "googleMapsUri",
  "nationalPhoneNumber",
  "businessStatus",
  "primaryType",
  "types",
  "priceLevel",
  "rating",
  "userRatingCount",
].join(",");

export function mapPlacesPriceLevel(value: string | undefined): PriceLevel | undefined {
  switch (value) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return undefined;
  }
}

function toDetails(place: PlaceDetailsResponse): PlacesRestaurantDetails | null {
  if (!place.id || !place.displayName?.text || !place.formattedAddress) {
    return null;
  }
  const formattedAddress = place.formattedAddress;
  const postcodeMatch = formattedAddress.match(/\b(\d{4}\s*[A-Z]{2})\b/i);
  const city = extractCity(formattedAddress) ?? "Netherlands";
  return {
    placeId: place.id,
    name: place.displayName.text,
    formattedAddress,
    address: formattedAddress.split(",")[0]?.trim() || formattedAddress,
    city,
    postcode: postcodeMatch?.[1]?.replace(/\s+/g, " ").toUpperCase(),
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    website: officialWebsiteOrUndefined(place.websiteUri),
    mapsUrl: place.googleMapsUri,
    phone: place.nationalPhoneNumber,
    businessStatus: place.businessStatus,
    primaryType: place.primaryType,
    types: place.types,
    priceLevel: mapPlacesPriceLevel(place.priceLevel),
    rating: place.rating,
    reviewCount: place.userRatingCount,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Place Details (New) by place ID.
 * Returns null when Places is not configured or the place is not found.
 */
export async function getRestaurantByPlaceId(
  placeId: string,
): Promise<PlacesRestaurantDetails | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const id = placeId.trim();
  if (!id) return null;

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Place Details ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  return toDetails(data);
}

/** Alias matching the design's refresh_restaurant(place_id). */
export async function refreshRestaurantByPlaceId(
  placeId: string,
): Promise<PlacesRestaurantDetails | null> {
  return getRestaurantByPlaceId(placeId);
}

/** True when Places content should be re-fetched under our soft TTL. */
export function placesContentNeedsRefresh(placesRefreshedAt: string | null | undefined): boolean {
  if (!placesRefreshedAt) return true;
  const refreshed = Date.parse(placesRefreshedAt);
  if (!Number.isFinite(refreshed)) return true;
  return Date.now() - refreshed >= PLACES_CONTENT_REFRESH_MS;
}

/**
 * Cheap place-id refresh (Essentials / ID-only SKU) for IDs older than ~12 months.
 * Returns the (possibly updated) place id, or null if obsolete.
 */
export async function refreshPlaceIdOnly(placeId: string): Promise<string | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;
  const id = placeId.trim();
  if (!id) return null;

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id",
      },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Place ID refresh ${response.status}: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

export type VenueMatchSignals = {
  name: string;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
};

/**
 * Multi-signal match score in [0, 1]. Name alone is never enough for auto-link.
 * Callers should require a high threshold (e.g. ≥ 0.75) plus at least two strong signals.
 */
export function scoreVenueMatch(
  left: VenueMatchSignals,
  right: VenueMatchSignals,
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  if (namesLikelyMatch(left.name, right.name)) {
    score += 0.35;
    signals.push("name");
  }

  const leftPost = normalizePostcode(left.postcode);
  const rightPost = normalizePostcode(right.postcode);
  if (leftPost && rightPost && leftPost === rightPost) {
    score += 0.25;
    signals.push("postcode");
  }

  if (
    left.lat != null &&
    left.lng != null &&
    right.lat != null &&
    right.lng != null
  ) {
    const km = haversineKm(
      { lat: left.lat, lng: left.lng },
      { lat: right.lat, lng: right.lng },
    );
    if (km <= 0.05) {
      score += 0.25;
      signals.push("coords_exact");
    } else if (km <= 0.15) {
      score += 0.15;
      signals.push("coords_near");
    }
  }

  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (leftPhone && rightPhone && leftPhone === rightPhone) {
    score += 0.2;
    signals.push("phone");
  }

  const leftHost = websiteHost(left.website);
  const rightHost = websiteHost(right.website);
  if (leftHost && rightHost && leftHost === rightHost) {
    score += 0.2;
    signals.push("website");
  }

  const leftAddr = normalizeName(left.address ?? "");
  const rightAddr = normalizeName(right.address ?? "");
  if (leftAddr && rightAddr && (leftAddr.includes(rightAddr) || rightAddr.includes(leftAddr))) {
    score += 0.1;
    signals.push("address");
  }

  return { score: Math.min(1, score), signals };
}

/** Auto-link only when confidence is high and name is not the sole signal. */
export function isHighConfidenceVenueMatch(result: {
  score: number;
  signals: string[];
}): boolean {
  if (result.score < 0.75) return false;
  const strong = result.signals.filter((s) => s !== "name" && s !== "address");
  return strong.length >= 1 && result.signals.includes("name");
}

function normalizePostcode(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D+/g, "");
  if (digits.length < 9) return null;
  return digits.replace(/^31/, "0").replace(/^0031/, "0");
}

function websiteHost(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const host = new URL(value.trim()).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
