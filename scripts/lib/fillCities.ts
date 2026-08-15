/** Delivery / dine hubs the scheduled fill strategy targets. */
export const FILL_CITIES = [
  "Leiden",
  "Amsterdam",
  "Rotterdam",
  "Den Haag",
  "Utrecht",
] as const;

export type FillCity = (typeof FILL_CITIES)[number];
