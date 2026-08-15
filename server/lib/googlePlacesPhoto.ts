/**
 * Fetch a restaurant photo via Google Places Text Search (Places API New).
 * Requires GOOGLE_PLACES_API_KEY.
 */

import { sameImageUrl, shuffleInPlace } from "./wikimedia.ts";

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

export function getGooglePlacesApiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

export async function fetchGoogleRestaurantPhoto(place: {
  name: string;
  city: string;
  address?: string | null;
  excludeUrls?: Array<string | null | undefined>;
}): Promise<{ url: string; attribution: string; query: string } | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const textQuery = [place.name, "restaurant", place.address, place.city, "Netherlands"]
    .filter(Boolean)
    .join(" ");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.photos,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      regionCode: "NL",
      maxResultCount: 5,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google search ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      photos?: Array<{
        name?: string;
        authorAttributions?: Array<{ displayName?: string }>;
      }>;
    }>;
  };

  const places = data.places ?? [];
  const match =
    places.find((candidate) =>
      namesLikelyMatch(place.name, candidate.displayName?.text ?? ""),
    ) ?? places[0];

  const photos = shuffleInPlace([...(match?.photos ?? [])]).filter((photo) => photo.name);
  if (photos.length === 0) return null;

  for (const photo of photos) {
    const photoName = photo.name!;
    const media = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey } },
    );
    if (!media.ok) continue;
    const payload = (await media.json()) as { photoUri?: string };
    if (!payload.photoUri) continue;

    if (
      place.excludeUrls?.some(
        (excluded) =>
          typeof excluded === "string" &&
          excluded.trim() &&
          sameImageUrl(payload.photoUri!, excluded.trim()),
      )
    ) {
      continue;
    }

    const credit = photo.authorAttributions?.[0]?.displayName ?? "Google";
    return {
      url: payload.photoUri,
      attribution: `Photo: ${credit} via Google`,
      query: textQuery,
    };
  }

  // If every photo matched the exclude list, fall back to a random one
  // so replace-image still returns something when only one photo exists.
  const fallback = photos[Math.floor(Math.random() * photos.length)]!;
  const media = await fetch(
    `https://places.googleapis.com/v1/${fallback.name}/media?maxHeightPx=800&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": apiKey } },
  );
  if (!media.ok) return null;
  const payload = (await media.json()) as { photoUri?: string };
  if (!payload.photoUri) return null;
  const credit = fallback.authorAttributions?.[0]?.displayName ?? "Google";
  return {
    url: payload.photoUri,
    attribution: `Photo: ${credit} via Google`,
    query: textQuery,
  };
}
