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
    expect(published).toHaveLength(30);
    for (const country of published) {
      const result = countrySchema.safeParse(country);
      if (!result.success) {
        throw new Error(
          `${country.code}: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it("keeps the catalog at the intended 197-country scope", () => {
    expect(CATALOG_SIZE).toBe(197);
    expect(countryCatalog).toHaveLength(197);
  });

  it("only exposes published countries via getCountryByCode", () => {
    expect(getCountryByCode("bg")?.name).toBe("Bulgaria");
    expect(getCountryByCode("xx")).toBeUndefined();
    expect(getCountryByCode("fr")?.name).toBe("France");
  });
});
