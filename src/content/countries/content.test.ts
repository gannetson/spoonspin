import { describe, expect, it } from "vitest";
import { countrySchema } from "@/schemas/content";
import {
  CATALOG_SIZE,
  countryCatalog,
  getCountryByCode,
  getPublishedCountries,
} from "@/content/countries";

describe("published country content", () => {
  it("validates every published country against the Zod schema", () => {
    const published = getPublishedCountries();
    expect(published.length).toBeGreaterThanOrEqual(20);
    for (const country of published) {
      const result = countrySchema.safeParse(country);
      if (!result.success) {
        throw new Error(
          `${country.code}: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it("keeps recipe ids and names unique within each published country", () => {
    for (const country of getPublishedCountries()) {
      const recipes = [
        country.menu.starter,
        country.menu.main,
        country.menu.side,
        country.menu.dessert,
      ];
      expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(recipes.length);
      expect(new Set(recipes.map((recipe) => recipe.name)).size).toBe(recipes.length);
    }
  });

  it("keeps the catalog at the intended 197-country scope", () => {
    expect(CATALOG_SIZE).toBe(197);
    expect(countryCatalog).toHaveLength(197);
  });

  it("only exposes published countries via getCountryByCode", () => {
    expect(getCountryByCode("bg")?.name).toBe("Bulgaria");
    expect(getCountryByCode("xx")).toBeUndefined();
    expect(getCountryByCode("fr")).toBeUndefined();
  });
});
