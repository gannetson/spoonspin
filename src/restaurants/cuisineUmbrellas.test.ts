import { describe, expect, it } from "vitest";
import { CUISINE_UMBRELLAS, umbrellasForCountry } from "./cuisineUmbrellas.ts";
import { countryCatalog } from "../content/countries/catalog.ts";

describe("umbrellasForCountry", () => {
  it("gives a Caribbean island the Caribbean umbrella", () => {
    const labels = umbrellasForCountry("bb").map((u) => u.label);
    expect(labels).toContain("Caribbean");
  });

  it("covers the small islands that have no NL specialist", () => {
    for (const code of ["kn", "lc", "vc", "gd", "dm", "ag"]) {
      expect(umbrellasForCountry(code).length).toBeGreaterThan(0);
    }
  });

  it("returns the narrowest umbrella first", () => {
    // Peru is Andean before it is Latin American; Nepal Himalayan before South Asian.
    expect(umbrellasForCountry("pe")[0]?.label).toBe("Andean");
    expect(umbrellasForCountry("np")[0]?.label).toBe("Himalayan");
  });

  it("gives large cuisines nothing to fall back on", () => {
    // Japan, France and Turkey have plenty of specialists; a regional fallback
    // would only dilute them.
    expect(umbrellasForCountry("jp")).toHaveLength(0);
    expect(umbrellasForCountry("fr")).toHaveLength(0);
  });

  it("caps how many umbrellas one country reaches for", () => {
    expect(umbrellasForCountry("ma").length).toBeLessThanOrEqual(2);
  });

  it("only references countries that exist in the catalog", () => {
    const known = new Set(countryCatalog.map((entry) => entry.code));
    for (const umbrella of CUISINE_UMBRELLAS) {
      for (const code of umbrella.countries) {
        expect(known, `${umbrella.id} references unknown country ${code}`).toContain(
          code,
        );
      }
    }
  });

  it("keeps no query term that probing showed to be wrong", () => {
    // Each of these reads plausibly but returns the wrong cuisine entirely:
    // "West Indies" -> Indian, "Baltic" -> Balkan, "Central American" ->
    // American steakhouses, "North African" -> East African.
    const terms = CUISINE_UMBRELLAS.flatMap((u) => u.queryTerms)
      .join(" | ")
      .toLowerCase();
    for (const bad of [
      "west indies",
      "baltic",
      "central american",
      "south american",
      "north african",
      "persian gulf",
      "pacific island",
    ]) {
      expect(terms).not.toContain(bad);
    }
  });
});
