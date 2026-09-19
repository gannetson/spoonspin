import type { Restaurant, RestaurantSearchParams, RestaurantSearchResult } from "./types";
import type {
  ReservationOptionsDto,
  ReservationOptionsQuery,
  ReservationProviderKey,
} from "./reservationOptions";
import { buildMapsSearchUrl, withDistances } from "./shared";

export async function fetchRestaurantById(id: string): Promise<Restaurant | null> {
  const response = await fetch(`/api/restaurants/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Could not load restaurant.");
  }
  const data = (await response.json()) as { restaurant: Restaurant };
  return data.restaurant;
}

export async function fetchReservationOptions(
  restaurantId: string,
  query: ReservationOptionsQuery = {},
): Promise<ReservationOptionsDto> {
  const params = new URLSearchParams();
  if (query.date) params.set("date", query.date);
  if (query.time) params.set("time", query.time);
  if (query.partySize != null) params.set("party_size", String(query.partySize));
  const qs = params.toString();
  const response = await fetch(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/reservation-options${
      qs ? `?${qs}` : ""
    }`,
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new Error("Could not load reservation options.");
  }
  return (await response.json()) as ReservationOptionsDto;
}

/** Fire-and-forget outbound click tracking. Returns opaque referral id when available. */
export async function recordReservationClick(input: {
  restaurantId: string;
  provider: ReservationProviderKey;
  partySize?: number;
  requestedDate?: string;
  requestedTime?: string;
}): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/restaurants/${encodeURIComponent(input.restaurantId)}/reservation-clicks`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: input.provider,
          party_size: input.partySize,
          requested_date: input.requestedDate,
          requested_time: input.requestedTime,
        }),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { referral_id?: string };
    return data.referral_id?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchRestaurants(
  params: RestaurantSearchParams,
): Promise<RestaurantSearchResult> {
  try {
    const response = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuisineAliases: params.cuisineAliases,
        countryName: params.countryName,
        countryCode: params.countryCode,
        regionId: params.regionId,
        cityOrPostcode: params.cityOrPostcode,
        visitorLocation: params.visitorLocation,
      }),
    });

    if (!response.ok) {
      const mapsSearchUrl = buildMapsSearchUrl(params);
      let message = "Restaurant search failed. You can still open Google Maps.";
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody.message) message = errorBody.message;
      } catch {
        // keep default message
      }
      return {
        status: "error",
        restaurants: [],
        source: "fallback",
        mapsSearchUrl,
        message,
      };
    }

    const data = (await response.json()) as RestaurantSearchResult;
    return {
      ...data,
      restaurants: withDistances(data.restaurants, params.visitorLocation),
    };
  } catch {
    return {
      status: "error",
      restaurants: [],
      source: "fallback",
      mapsSearchUrl: buildMapsSearchUrl(params),
      message:
        "Restaurant search is unavailable right now. Country and recipe browsing still work.",
    };
  }
}
