/**
 * TheFork B2B (https://docs.thefork.io) has no restaurant directory/search.
 * Documented restaurant paths all require a known {id} (timeslots, offers, reservations).
 * Admin discover still runs this step so the UI can log TheFork explicitly.
 */

import { theForkCredentials } from "../reservations/config.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";

export function isTheForkDiscoverConfigured(): boolean {
  return theForkCredentials().configured;
}

export async function searchTheForkRestaurants(input: {
  countryName: string;
  onProgress?: (message: string) => void;
}): Promise<{ places: GroundedPlace[]; notes: string }> {
  if (!theForkCredentials().configured) {
    return {
      places: [],
      notes:
        "TheFork skipped (set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET). B2B API has no restaurant search.",
    };
  }

  input.onProgress?.("TheFork · B2B API (timeslots/booking only — no directory search)…");
  return {
    places: [],
    notes:
      `TheFork B2B has no restaurant directory (docs.thefork.io). ` +
      `Booking links attach after save when a thefork.nl profile URL is known. ` +
      `Searched catalog for ${input.countryName}: 0.`,
  };
}
