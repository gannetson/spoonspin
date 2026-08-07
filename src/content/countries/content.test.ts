import { describe, expect, it } from "vitest";
import { countrySchema, stubCountrySchema } from "@/schemas/content";
import {
  CATALOG_SIZE,
  countryCatalog,
  getCookReadyCountries,
  getCountryByCode,
  getPublishedCountries,
} from "@/content/countries";

describe("worldwide country content", () => {
  it("exposes every catalog country for spinning", () => {
    const spinable = getPublishedCountries();
    expect(spinable).toHaveLength(CATALOG_SIZE);
    expect(CATALOG_SIZE).toBe(197);
    expect(countryCatalog).toHaveLength(197);
    expect(spinable.every((country) => country.status === "published")).toBe(
      true,
    );
  });

  it("validates every cook-ready country against the full Zod schema", () => {
    const cookReady = getCookReadyCountries();
    expect(cookReady.length).toBeGreaterThanOrEqual(30);
    for (const country of cookReady) {
      const result = countrySchema.safeParse(country);
      if (!result.success) {
        throw new Error(
          `${country.code}: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it("validates stub countries (no cook menu yet)", () => {
    const stubs = getPublishedCountries().filter((country) => !country.cookReady);
    expect(stubs.length).toBeGreaterThan(100);
    for (const country of stubs) {
      const result = stubCountrySchema.safeParse(country);
      if (!result.success) {
        throw new Error(
          `${country.code}: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it("resolves authored and stub countries by code", () => {
    expect(getCountryByCode("bg")?.name).toBe("Bulgaria");
    expect(getCountryByCode("bg")?.cookReady).toBe(true);
    expect(getCountryByCode("af")?.name).toBe("Afghanistan");
    expect(getCountryByCode("af")?.cookReady).toBe(false);
    expect(getCountryByCode("xx")).toBeUndefined();
    expect(getCountryByCode("fr")?.name).toBe("France");
    expect(getCountryByCode("gb")?.cookReady).toBe(true);
    expect(getCountryByCode("pl")?.cookReady).toBe(true);
  });
});
