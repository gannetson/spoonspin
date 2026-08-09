/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  extractCity,
  isInNetherlands,
  namesLikelyMatch,
  normalizeName,
} from "./googlePlacesLookup";

describe("normalizeName", () => {
  it("strips accents and punctuation", () => {
    expect(normalizeName("Café Blauw!")).toBe("cafe blauw");
  });
});

describe("namesLikelyMatch", () => {
  it("matches substring and token overlap", () => {
    expect(
      namesLikelyMatch("Restaurant Blauw", "Restaurant Blauw Amsterdam"),
    ).toBe(true);
    expect(namesLikelyMatch("Kantjil & de Tijger", "Kantjil en de Tijger")).toBe(
      true,
    );
    expect(namesLikelyMatch("Blauw", "Restaurant Mamouche")).toBe(false);
  });
});

describe("isInNetherlands", () => {
  it("accepts country labels", () => {
    expect(
      isInNetherlands("Amstelveenseweg 158, 1075 XN Amsterdam, Netherlands"),
    ).toBe(true);
    expect(isInNetherlands("Somewhere, Nederland")).toBe(true);
  });

  it("accepts Dutch postcodes when country is omitted", () => {
    // Places API with regionCode=NL often omits the country.
    expect(isInNetherlands("Amstelveenseweg 158-160, 1075 XN Amsterdam")).toBe(
      true,
    );
    expect(isInNetherlands("Spuistraat 291 A, 1012 VS Amsterdam")).toBe(true);
  });

  it("rejects addresses without NL signals", () => {
    expect(isInNetherlands("221B Baker Street, London")).toBe(false);
    expect(isInNetherlands("Berlin, Germany")).toBe(false);
  });
});

describe("extractCity", () => {
  it("reads city when country is present", () => {
    expect(
      extractCity("Amstelveenseweg 158, 1075 XN Amsterdam, Netherlands"),
    ).toBe("Amsterdam");
  });

  it("reads city when country is omitted", () => {
    expect(extractCity("Amstelveenseweg 158-160, 1075 XN Amsterdam")).toBe(
      "Amsterdam",
    );
    expect(extractCity("Spuistraat 291 A, 1012 VS Amsterdam")).toBe(
      "Amsterdam",
    );
  });
});
