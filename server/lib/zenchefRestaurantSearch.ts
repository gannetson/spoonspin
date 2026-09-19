/**
 * Zenchef partner restaurant list (https://zenchefapi.resengo.com).
 * Documented as GET /Partner/{partnerId}/Restaurants with an ApiKey header.
 * This is the partner catalog — not a public NL marketplace search.
 */

import {
  extractCity,
  isInNetherlands,
  namesLikelyMatch,
  officialWebsiteOrUndefined,
  type GroundedPlace,
} from "./googlePlacesLookup.ts";
import { zenchefCredentials } from "../reservations/config.ts";

const ZENCHEF_API_BASE = "https://zenchefapi.resengo.com";

export function isZenchefDiscoverConfigured(): boolean {
  const creds = zenchefCredentials();
  return Boolean(creds.configured && creds.partnerId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function translationTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(asRecord(item)?.title))
    .filter((title): title is string => Boolean(title));
}

function descriptionTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(asRecord(item)?.text))
    .filter((text): text is string => Boolean(text));
}

function cuisineHaystack(row: Record<string, unknown>): string {
  const cuisineTitles = Array.isArray(row.cuisines)
    ? row.cuisines.flatMap((item) => translationTitles(asRecord(item)?.translations))
    : [];
  return [asString(row.name), ...cuisineTitles, ...descriptionTexts(row.descriptions)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesCuisine(
  haystack: string,
  countryName: string,
  aliases: string[],
): boolean {
  const needles = [countryName, ...aliases]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 3);
  if (needles.length === 0) return false;
  return needles.some(
    (needle) => haystack.includes(needle) || namesLikelyMatch(haystack, needle),
  );
}

export function zenchefBookingUrl(restaurantId: string | number): string {
  return `https://bookings.zenchef.com/results?rid=${encodeURIComponent(String(restaurantId))}`;
}

export function mapZenchefRestaurantItem(
  raw: unknown,
  matchedQuery: string,
): GroundedPlace | null {
  const row = asRecord(raw);
  if (!row) return null;
  const name = asString(row.name);
  if (!name) return null;

  const city = asString(row.city) || extractCity(asString(row.address) ?? "") || "";
  const address =
    asString(row.address) || [asString(row.zip), city].filter(Boolean).join(" ");
  const iso = (asString(row.country_iso2) ?? "").toUpperCase();
  if (iso && iso !== "NL") return null;
  const locationBlob = `${address}, ${city}${iso === "NL" ? ", Netherlands" : ""}`;
  if (!isInNetherlands(locationBlob) && iso !== "NL") return null;
  if (!city) return null;

  const id = asString(row.id) ?? asString(row.sf_account_id) ?? name.toLowerCase();
  const website = officialWebsiteOrUndefined(
    asString(row.own_website) ?? asString(row.website),
  );
  const cuisineHint = Array.isArray(row.cuisines)
    ? row.cuisines
        .flatMap((item) => translationTitles(asRecord(item)?.translations))
        .slice(0, 4)
        .join(", ")
    : "";

  return {
    placeId: `zenchef:${id}`,
    name,
    address,
    city,
    postcode: asString(row.zip),
    lat: asNumber(row.latitude),
    lng: asNumber(row.longitude),
    website,
    mapsUrl: undefined,
    phone: asString(row.phone) ?? asString(row.phone2),
    matchedQuery: [matchedQuery, cuisineHint].filter(Boolean).join(" · ") || undefined,
    source: "zenchef",
    zenchefUrl: zenchefBookingUrl(id),
  };
}

export async function searchZenchefRestaurants(input: {
  countryName: string;
  query?: string;
  cuisineAliases?: string[];
  onProgress?: (message: string) => void;
}): Promise<{ places: GroundedPlace[]; notes: string }> {
  const creds = zenchefCredentials();
  if (!creds.configured || !creds.apiKey) {
    return {
      places: [],
      notes: "Zenchef skipped (set ZENCHEF_API_KEY).",
    };
  }
  if (!creds.partnerId) {
    return {
      places: [],
      notes:
        "Zenchef skipped (set ZENCHEF_PARTNER_ID for GET /Partner/{id}/Restaurants).",
    };
  }

  input.onProgress?.("Zenchef · partner restaurant catalog…");
  const url = `${ZENCHEF_API_BASE}/Partner/${encodeURIComponent(creds.partnerId)}/Restaurants`;
  const response = await fetch(url, {
    headers: { ApiKey: creds.apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zenchef partner list ${response.status}: ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as unknown;
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(asRecord(payload)?.data)
      ? (asRecord(payload)?.data as unknown[])
      : [];

  const aliases = (input.cuisineAliases ?? [])
    .map((alias) => alias.trim())
    .filter(Boolean);
  const focus = input.query?.trim().toLowerCase();
  const matchedQuery = `Zenchef · ${input.countryName}`;
  const places: GroundedPlace[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const record = asRecord(row);
    if (!record) continue;
    const haystack = cuisineHaystack(record);
    if (!matchesCuisine(haystack, input.countryName, aliases)) continue;
    if (
      focus &&
      !haystack.includes(focus) &&
      !asString(record.city)?.toLowerCase().includes(focus)
    ) {
      continue;
    }
    const place = mapZenchefRestaurantItem(row, matchedQuery);
    if (!place) continue;
    const key = `${place.name.toLowerCase()}|${place.city.toLowerCase()}`;
    if (seen.has(key) || seen.has(place.placeId)) continue;
    seen.add(key);
    seen.add(place.placeId);
    places.push(place);
  }

  return {
    places,
    notes: `Zenchef partner catalog: ${places.length} NL ${input.countryName} match(es) of ${rows.length} restaurant(s).`,
  };
}
