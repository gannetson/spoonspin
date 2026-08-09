export type TagEntityType = "recipe" | "drink" | "restaurant";
export type TagIntent = "want" | "did";

export type UserTag = {
  id: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  intent: TagIntent;
  rating: number | null;
  reviewText: string | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type TagSummary = {
  countriesTasted: number;
  countryCodes: string[];
  /** Distinct countries with at least one “want to” tag. */
  countriesPlanned: number;
  plannedCountryCodes: string[];
  counts: {
    total: number;
    want: number;
    did: number;
    recipe: number;
    drink: number;
    restaurant: number;
  };
  level: {
    countriesTasted: number;
    totalCountries: number;
    currentId: string | null;
    currentThreshold: number | null;
    nextId: string | null;
    nextThreshold: number | null;
    progressToNext: number;
  };
};

/** Stable drink key when Drink.id is missing. */
export function drinkEntityId(drink: { id?: string; name: string }): string {
  const existing = drink.id?.trim();
  if (existing) return existing;
  return slugifyDrinkName(drink.name);
}

export function slugifyDrinkName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "drink";
}
