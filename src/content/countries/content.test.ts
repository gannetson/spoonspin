import { describe, expect, it } from "vitest";
import { stubCountrySchema } from "@/schemas/content";
import {
  CATALOG_SIZE,
  countryCatalog,
  getCookReadyCountries,
  getCountryByCode,
  getPublishedCountries,
} from "@/content/countries";

describe("worldwide country catalog (thin stubs)", () => {
  it("exposes every catalog country as a stub (menus live in Postgres)", () => {
    const spinable = getPublishedCountries();
    expect(spinable).toHaveLength(CATALOG_SIZE);
    expect(CATALOG_SIZE).toBe(197);
    expect(countryCatalog).toHaveLength(197);
    expect(spinable.every((country) => country.status === "published")).toBe(true);
    expect(spinable.every((country) => !country.cookReady)).toBe(true);
    expect(getCookReadyCountries()).toHaveLength(0);
  });

  it("validates stub countries against the stub Zod schema", () => {
    for (const country of getPublishedCountries()) {
      const result = stubCountrySchema.safeParse(country);
      if (!result.success) {
        throw new Error(
          `${country.code}: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
    }
  });

  it("resolves catalog countries by code", () => {
    expect(getCountryByCode("bg")?.name).toBe("Bulgaria");
    expect(getCountryByCode("af")?.name).toBe("Afghanistan");
    expect(getCountryByCode("xx")).toBeUndefined();
    expect(getCountryByCode("fr")?.name).toBe("France");
  });
});
