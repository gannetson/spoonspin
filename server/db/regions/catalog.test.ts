/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  listCountryCatalogCodes,
  loadCountryAliases,
  loadCountryCatalog,
  normalizeRegionName,
  resolveCanonicalRegionName,
} from "./catalog";

const ISO_COUNTRIES = ["br", "cn", "es", "id", "in", "it", "mx"];
const CULINARY_COUNTRIES = ["fr", "jp", "pe", "th", "tr", "vn"];

describe("region catalogs", () => {
  it("includes China plus the regional-cuisine countries", () => {
    expect(listCountryCatalogCodes()).toEqual(
      [...ISO_COUNTRIES, ...CULINARY_COUNTRIES].sort(),
    );
  });

  it("has unique codes and names in every catalog", () => {
    for (const code of listCountryCatalogCodes()) {
      const catalog = loadCountryCatalog(code);
      expect(catalog, code).toBeDefined();
      const isoCodes = catalog!.subdivisions.map((entry) => entry.isoCode);
      const names = catalog!.subdivisions.map((entry) => normalizeRegionName(entry.name));
      expect(new Set(isoCodes).size, `${code} isoCode`).toBe(isoCodes.length);
      expect(new Set(names).size, `${code} name`).toBe(names.length);
      expect(isoCodes.length).toBeGreaterThan(0);
    }
  });

  it("keeps alias keys normalized and pointing at catalog codes", () => {
    for (const code of listCountryCatalogCodes()) {
      const catalog = loadCountryCatalog(code);
      const aliases = loadCountryAliases(code);
      const isoCodes = new Set(catalog?.subdivisions.map((entry) => entry.isoCode));
      for (const [alias, isoCode] of Object.entries(aliases)) {
        expect(alias, `${code} alias "${alias}"`).toBe(normalizeRegionName(alias));
        expect(isoCodes.has(isoCode), `${code} alias "${alias}" → ${isoCode}`).toBe(true);
      }
    }
  });

  it("resolves well-known culinary aliases", () => {
    expect(resolveCanonicalRegionName("orissa", "in")).toBe("Odisha");
    expect(resolveCanonicalRegionName("sicilia", "it")).toBe("Sicily");
    expect(resolveCanonicalRegionName("euskadi", "es")).toBe("Basque Country");
    expect(resolveCanonicalRegionName("cdmx", "mx")).toBe("Mexico City");
    expect(resolveCanonicalRegionName("padang", "id")).toBe("West Sumatra");
    expect(resolveCanonicalRegionName("isaan", "th")).toBe("Isan");
    expect(resolveCanonicalRegionName("saigon", "vn")).toBe("Southern");
    expect(resolveCanonicalRegionName("kinki", "jp")).toBe("Kansai");
    expect(resolveCanonicalRegionName("gaziantep", "tr")).toBe("Southeastern Anatolia");
    expect(resolveCanonicalRegionName("bretagne", "fr")).toBe("Brittany");
    expect(resolveCanonicalRegionName("cusco", "pe")).toBe("Sierra");
    expect(resolveCanonicalRegionName("minas", "br")).toBe("Minas Gerais");
  });
});
