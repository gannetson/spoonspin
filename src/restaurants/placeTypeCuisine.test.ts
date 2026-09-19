import { describe, expect, it } from "vitest";
import { placeTypeLabel, placeTypeVerdict } from "./placeTypeCuisine.ts";

describe("placeTypeVerdict", () => {
  it("confirms a specific type that names the searched country", () => {
    expect(placeTypeVerdict("tr", ["turkish_restaurant", "restaurant"])).toEqual({
      kind: "match",
      type: "turkish_restaurant",
    });
  });

  it("rejects a Turkish venue found under an Armenian search, and says where it belongs", () => {
    const verdict = placeTypeVerdict("am", ["turkish_restaurant", "restaurant"]);
    expect(verdict).toEqual({
      kind: "mismatch",
      type: "turkish_restaurant",
      codes: ["tr"],
    });
  });

  it("prefers a confirming type over a co-listed mismatch", () => {
    // Venues legitimately carry several cuisine types; one match is enough.
    const verdict = placeTypeVerdict("es", ["mexican_restaurant", "tapas_restaurant"]);
    expect(verdict.kind).toBe("match");
  });

  it("treats a regional type covering the country as weak support", () => {
    expect(placeTypeVerdict("am", ["eastern_european_restaurant"])).toEqual({
      kind: "region",
      type: "eastern_european_restaurant",
    });
  });

  it("counts a regional type that excludes the country as evidence against", () => {
    expect(placeTypeVerdict("th", ["eastern_european_restaurant"])).toEqual({
      kind: "region-mismatch",
      type: "eastern_european_restaurant",
    });
  });

  it("stays neutral on a plain restaurant", () => {
    expect(placeTypeVerdict("am", ["restaurant", "food", "point_of_interest"])).toEqual({
      kind: "neutral",
    });
  });

  it("stays neutral with no types at all", () => {
    expect(placeTypeVerdict("am", undefined).kind).toBe("neutral");
    expect(placeTypeVerdict("am", { types: [] }).kind).toBe("neutral");
  });

  it("will not condemn on a stray type buried in the tail", () => {
    // A real Amsterdam venue: Google's primary guess is Middle Eastern, but its
    // `types` grab-bag also lists british_restaurant ninth of fifteen.
    const verdict = placeTypeVerdict("dz", {
      primaryType: "middle_eastern_restaurant",
      types: [
        "middle_eastern_restaurant",
        "halal_restaurant",
        "bar_and_grill",
        "mediterranean_restaurant",
        "british_restaurant",
        "restaurant",
      ],
    });
    expect(verdict.kind).toBe("region-mismatch");
    expect(JSON.stringify(verdict)).not.toContain("british");
  });

  it("still confirms from anywhere in the type list", () => {
    const verdict = placeTypeVerdict("ma", {
      primaryType: "restaurant",
      types: ["restaurant", "moroccan_restaurant"],
    });
    expect(verdict).toEqual({ kind: "match", type: "moroccan_restaurant" });
  });

  it("condemns on the primary type when it names another country", () => {
    const verdict = placeTypeVerdict("am", {
      primaryType: "turkish_restaurant",
      types: ["turkish_restaurant", "restaurant"],
    });
    expect(verdict).toEqual({
      kind: "mismatch",
      type: "turkish_restaurant",
      codes: ["tr"],
    });
  });

  it("maps several aliases onto the same cuisine", () => {
    expect(placeTypeVerdict("jp", ["sushi_restaurant"]).kind).toBe("match");
    expect(placeTypeVerdict("jp", ["ramen_restaurant"]).kind).toBe("match");
  });

  it("labels a raw type for display", () => {
    expect(placeTypeLabel("middle_eastern_restaurant")).toBe("Middle eastern restaurant");
  });
});
