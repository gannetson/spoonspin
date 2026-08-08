/**
 * Look up a restaurant via Google Places Text Search (Places API New).
 * Used to verify discover candidates exist before offering them to admins.
 */

import {
  getGooglePlacesApiKey,
  isGooglePlacesConfigured,
} from "./googlePlacesPhoto.ts";

export { isGooglePlacesConfigured };

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
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

function extractCity(formattedAddress: string): string | undefined {
  // "Street 1, 1234 AB City, Netherlands"
  const parts = formattedAddress.split(",").map((p) => p.trim());
  if (parts.length < 2) return undefined;
  const beforeCountry = parts[parts.length - 2] ?? "";
  const withoutPostcode = beforeCountry.replace(/^\d{4}\s*[A-Z]{2}\s+/i, "").trim();
  return withoutPostcode || beforeCountry || undefined;
}

function isInNetherlands(formattedAddress: string): boolean {
  return /nederland|netherlands|\bnl\b/i.test(formattedAddress);
}

export type GooglePlaceMatch = {
  placeId: string;
  name: string;
  address: string;
  city: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  mapsUrl?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
};

export async function lookupGoogleRestaurant(place: {
  name: string;
  city: string;
  address?: string | null;
}): Promise<GooglePlaceMatch | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const textQuery = [
    place.name,
    "restaurant",
    place.address,
    place.city,
    "Netherlands",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.nationalPhoneNumber",
          "places.rating",
          "places.userRatingCount",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "en",
        regionCode: "NL",
        maxResultCount: 5,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google search ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      websiteUri?: string;
      googleMapsUri?: string;
      nationalPhoneNumber?: string;
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  const candidates = (data.places ?? []).filter(
    (candidate) =>
      candidate.id &&
      candidate.displayName?.text &&
      candidate.formattedAddress &&
      isInNetherlands(candidate.formattedAddress),
  );

  const match =
    candidates.find((candidate) =>
      namesLikelyMatch(place.name, candidate.displayName?.text ?? ""),
    ) ?? null;

  if (!match?.id || !match.displayName?.text || !match.formattedAddress) {
    return null;
  }

  const postcodeMatch = match.formattedAddress.match(/\b(\d{4}\s*[A-Z]{2})\b/i);
  const city =
    extractCity(match.formattedAddress) ??
    (place.city.trim() || "Netherlands");

  return {
    placeId: match.id,
    name: match.displayName.text,
    address: match.formattedAddress.split(",")[0]?.trim() || match.formattedAddress,
    city,
    postcode: postcodeMatch?.[1]?.replace(/\s+/g, " ").toUpperCase(),
    lat: match.location?.latitude,
    lng: match.location?.longitude,
    website: match.websiteUri,
    mapsUrl: match.googleMapsUri,
    phone: match.nationalPhoneNumber,
    rating: match.rating,
    reviewCount: match.userRatingCount,
  };
}
