/**
 * Look up a restaurant via Google Places Text Search (Places API New).
 * Used to verify discover candidates exist before offering them to admins.
 */

import {
  getGooglePlacesApiKey,
  isGooglePlacesConfigured,
} from "./googlePlacesPhoto.ts";

export { isGooglePlacesConfigured };

export function normalizeName(value: string): string {
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

export function extractCity(formattedAddress: string): string | undefined {
  // With country: "Street 1, 1234 AB City, Netherlands"
  // Without country (common with regionCode=NL): "Street 1, 1234 AB City"
  const parts = formattedAddress.split(",").map((p) => p.trim());
  if (parts.length < 2) return undefined;
  const last = parts[parts.length - 1] ?? "";
  const cityPart = /nederland|netherlands|\bnl\b/i.test(last)
    ? (parts[parts.length - 2] ?? "")
    : last;
  const withoutPostcode = cityPart.replace(/^\d{4}\s*[A-Z]{2}\s+/i, "").trim();
  return withoutPostcode || cityPart || undefined;
}

/** Dutch postcode: 4 digits + 2 letters (e.g. 1075 XN). */
const DUTCH_POSTCODE = /\b\d{4}\s*[A-Z]{2}\b/i;

/**
 * Places Text Search with regionCode=NL often omits the country from
 * formattedAddress ("… Amsterdam" instead of "… Amsterdam, Netherlands").
 * Accept explicit country labels or a Dutch postcode.
 */
export function isInNetherlands(formattedAddress: string): boolean {
  if (/nederland|netherlands|\bnl\b/i.test(formattedAddress)) return true;
  return DUTCH_POSTCODE.test(formattedAddress);
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

type PlacesSearchHit = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
};

async function searchGooglePlaces(
  apiKey: string,
  textQuery: string,
): Promise<PlacesSearchHit[]> {
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

  const data = (await response.json()) as { places?: PlacesSearchHit[] };
  return data.places ?? [];
}

function pickNetherlandsMatch(
  places: PlacesSearchHit[],
  name: string,
): PlacesSearchHit | null {
  const candidates = places.filter(
    (candidate) =>
      candidate.id &&
      candidate.displayName?.text &&
      candidate.formattedAddress &&
      isInNetherlands(candidate.formattedAddress),
  );

  return (
    candidates.find((candidate) =>
      namesLikelyMatch(name, candidate.displayName?.text ?? ""),
    ) ?? null
  );
}

function toMatch(
  match: PlacesSearchHit,
  fallbackCity: string,
): GooglePlaceMatch {
  const formattedAddress = match.formattedAddress!;
  const postcodeMatch = formattedAddress.match(/\b(\d{4}\s*[A-Z]{2})\b/i);
  const city =
    extractCity(formattedAddress) ?? (fallbackCity.trim() || "Netherlands");

  return {
    placeId: match.id!,
    name: match.displayName!.text!,
    address: formattedAddress.split(",")[0]?.trim() || formattedAddress,
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

export async function lookupGoogleRestaurant(place: {
  name: string;
  city: string;
  address?: string | null;
}): Promise<GooglePlaceMatch | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const city = place.city.trim();
  const address = place.address?.trim() || "";

  // Prefer name + city first — LLM-suggested street addresses are often wrong
  // and poison Text Search when included.
  const queries = [
    [place.name, "restaurant", city, "Netherlands"].filter(Boolean).join(" "),
    address
      ? [place.name, "restaurant", address, city, "Netherlands"]
          .filter(Boolean)
          .join(" ")
      : null,
  ].filter((query, index, all): query is string => {
    if (!query) return false;
    return all.indexOf(query) === index;
  });

  for (const textQuery of queries) {
    const places = await searchGooglePlaces(apiKey, textQuery);
    const match = pickNetherlandsMatch(places, place.name);
    if (match) return toMatch(match, city);
  }

  return null;
}
