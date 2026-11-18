import { FILL_CITIES_ORDERED } from "../../src/restaurants/coverage.ts";

/** The five Randstad delivery hubs: the core of the content fill. */
export const FILL_CITIES = [
  "Leiden",
  "Amsterdam",
  "Rotterdam",
  "Den Haag",
  "Utrecht",
] as const;

export type FillCity = (typeof FILL_CITIES)[number];

/** Every delivery city the order lane works through, core hubs first (NL, BE and western DE). */
export const ORDER_FILL_CITIES: string[] = [...FILL_CITIES_ORDERED];
