import type { Country, CountryCatalogEntry } from "@/types/content";
import { countryCatalog } from "./catalog";

/**
 * Thin catalog stubs for client-side helpers (flags, names).
 * Full cook menus, drinks, shops, and wikipedia live in Postgres and load via API.
 */
function buildStub(entry: CountryCatalogEntry): Country {
  return {
    code: entry.code,
    slug: entry.slug,
    name: entry.name,
    flag: entry.flag,
    region: entry.region,
    introduction: `${entry.name} has a distinctive food culture. Open a country after content loads from the server for recipes and drinks.`,
    cuisineAliases: [
      `${entry.name} restaurant`,
      `${entry.name} cuisine`,
      `${entry.name} food`,
    ],
    cookReady: false,
    status: "published",
  };
}

/** Every catalog country as a thin stub (no menus). */
export const allCountries: Country[] = countryCatalog.map(buildStub);

export function getCookReadyCountries(): Country[] {
  return allCountries.filter((country) => country.cookReady);
}
