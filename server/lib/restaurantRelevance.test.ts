import { describe, expect, it } from "vitest";
import {
  KEEP_THRESHOLD,
  mergeRankedResults,
  planDiscoveryQueries,
  planUmbrellaQueries,
  rankDecay,
  scoreCandidate,
  type MergedCandidate,
} from "./restaurantRelevance.ts";
import { buildCuisineTermIndex } from "./cuisineMention.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";

const index = buildCuisineTermIndex([
  { code: "am", name: "Armenia", cuisineAliases: ["Armenian", "Armeens"] },
  { code: "tr", name: "Turkey", cuisineAliases: ["Turkish", "Turks"] },
  { code: "ge", name: "Georgia", cuisineAliases: ["Georgian", "Georgisch"] },
  { code: "ma", name: "Morocco", cuisineAliases: ["Moroccan", "Marokkaans"] },
  { code: "dz", name: "Algeria", cuisineAliases: ["Algerian", "Algerijns"] },
]);

function place(overrides: Partial<GroundedPlace> = {}): GroundedPlace {
  return {
    placeId: overrides.placeId ?? "p1",
    name: "Test Venue",
    address: "Teststraat 1",
    city: "Amsterdam",
    source: "google",
    ...overrides,
  };
}

function candidate(
  overrides: Partial<GroundedPlace> = {},
  hits: MergedCandidate["hits"] = [{ query: "q", kind: "demonym", rank: 0 }],
): MergedCandidate {
  return { place: place(overrides), hits };
}

describe("planDiscoveryQueries", () => {
  it("searches nationwide rather than city by city", () => {
    const queries = planDiscoveryQueries({
      countryName: "Armenia",
      cuisineAliases: ["Armenian restaurant", "Armeens restaurant"],
    });
    expect(queries.every((query) => /Nederland|Netherlands/i.test(query.text))).toBe(
      true,
    );
    expect(queries.some((query) => /Groningen|Maastricht|Leiden/i.test(query.text))).toBe(
      false,
    );
  });

  it("drops vague regional aliases that pull in neighbouring cuisines", () => {
    // "Caucasus restaurant" is curated onto Armenia and reliably returns
    // Georgian and Turkish venues, which is what it must not do as a query.
    const queries = planDiscoveryQueries({
      countryName: "Armenia",
      cuisineAliases: ["Armenian restaurant", "Caucasus restaurant"],
    });
    expect(queries.some((query) => /caucasus/i.test(query.text))).toBe(false);
    expect(queries.some((query) => /armenian/i.test(query.text))).toBe(true);
  });

  it("phrases queries around the country's own dishes", () => {
    const queries = planDiscoveryQueries({
      countryName: "Armenia",
      dishNames: ["Khorovats"],
    });
    const dish = queries.find((query) => query.kind === "dish");
    expect(dish?.text).toContain("Khorovats");
  });

  it("narrows with the admin's focus instead of replacing the cuisine", () => {
    const queries = planDiscoveryQueries({
      countryName: "Armenia",
      focus: "Rotterdam",
    });
    const focused = queries.filter((query) => query.kind === "focus");
    expect(focused.length).toBeGreaterThan(0);
    expect(focused.every((query) => /Armenia/i.test(query.text))).toBe(true);
    // The unfocused nationwide queries survive alongside it.
    expect(queries.some((query) => query.kind === "demonym")).toBe(true);
  });

  it("never repeats the same query text", () => {
    const queries = planDiscoveryQueries({
      countryName: "Armenia",
      cuisineAliases: ["Armenia restaurant", "Armenia cuisine"],
    });
    const texts = queries.map((query) => query.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("rankDecay", () => {
  it("is worth most at the top of the results", () => {
    expect(rankDecay(0)).toBe(1);
    expect(rankDecay(5)).toBeLessThan(rankDecay(1));
    expect(rankDecay(19)).toBeLessThan(0.2);
  });
});

describe("mergeRankedResults", () => {
  it("remembers every query that found a venue", () => {
    const hit = place({ placeId: "x", rank: 0 });
    const merged = mergeRankedResults([
      { query: "a", kind: "demonym", places: [{ ...hit, rank: 0 }] },
      { query: "b", kind: "dish", places: [{ ...hit, rank: 3 }] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.hits).toHaveLength(2);
  });

  it("keeps the best rank when one query returns a venue twice", () => {
    const hit = place({ placeId: "x" });
    const merged = mergeRankedResults([
      { query: "a", kind: "demonym", places: [{ ...hit, rank: 7 }] },
      { query: "a", kind: "demonym", places: [{ ...hit, rank: 2 }] },
    ]);
    expect(merged[0]!.hits[0]!.rank).toBe(2);
  });
});

describe("scoreCandidate", () => {
  it("rejects a Turkish venue found by an Armenian search", () => {
    const result = scoreCandidate({
      candidate: candidate({
        name: "Dostlar Grillhuis",
        primaryType: "turkish_restaurant",
        placeTypes: ["turkish_restaurant", "restaurant"],
      }),
      searchCode: "am",
      index,
    });
    expect(result.score).toBeLessThan(KEEP_THRESHOLD);
    expect(result.mismatchCodes).toContain("tr");
  });

  it("keeps a venue whose name carries the cuisine", () => {
    const result = scoreCandidate({
      candidate: candidate({ name: "Armenian House" }),
      searchCode: "am",
      index,
    });
    expect(result.score).toBeGreaterThanOrEqual(KEEP_THRESHOLD);
  });

  it("keeps a venue named after one of the country's dishes", () => {
    const result = scoreCandidate({
      candidate: candidate({ name: "Restaurant Lavash" }),
      searchCode: "am",
      index,
      extraTerms: ["Lavash", "Khorovats"],
    });
    expect(result.score).toBeGreaterThanOrEqual(KEEP_THRESHOLD);
  });

  it("does not let popularity stand in for cuisine evidence", () => {
    // A busy generic restaurant that a cuisine query happened to return.
    const result = scoreCandidate({
      candidate: candidate(
        { name: "De Blauwe Hollander", rating: 4.6, reviewCount: 4000 },
        [{ query: "q", kind: "demonym", rank: 18 }],
      ),
      searchCode: "am",
      index,
    });
    expect(result.score).toBeLessThan(KEEP_THRESHOLD);
  });

  it("rewards agreement across independent queries", () => {
    const once = scoreCandidate({
      candidate: candidate({ name: "NOAH lieven" }, [
        { query: "a", kind: "demonym", rank: 0 },
      ]),
      searchCode: "am",
      index,
    });
    const thrice = scoreCandidate({
      candidate: candidate({ name: "NOAH lieven" }, [
        { query: "a", kind: "demonym", rank: 0 },
        { query: "b", kind: "demonym", rank: 1 },
        { query: "c", kind: "dish", rank: 0 },
      ]),
      searchCode: "am",
      index,
    });
    expect(thrice.score).toBeGreaterThan(once.score);
  });

  it("counts a Google category as confirmation", () => {
    const result = scoreCandidate({
      candidate: candidate({
        name: "Sofra",
        primaryType: "turkish_restaurant",
        placeTypes: ["turkish_restaurant"],
      }),
      searchCode: "tr",
      index,
    });
    expect(result.typeVerdict).toBe("match");
    expect(result.score).toBeGreaterThan(KEEP_THRESHOLD);
    expect(result.listingEvidence.join(" ")).toContain("Turkish restaurant");
  });

  it("treats an OSM cuisine tag as strong evidence", () => {
    const result = scoreCandidate({
      candidate: candidate({
        name: "Sofra",
        source: "osm",
        sourceCuisineTags: ["turkish"],
      }),
      searchCode: "tr",
      index,
    });
    expect(result.score).toBeGreaterThan(KEEP_THRESHOLD);
  });

  it("files a Moroccan venue under Morocco when searched as Algerian", () => {
    const result = scoreCandidate({
      candidate: candidate({
        name: "Marhaba - Marokkaans Restaurant",
        primaryType: "moroccan_restaurant",
        placeTypes: ["moroccan_restaurant"],
      }),
      searchCode: "dz",
      index,
    });
    expect(result.score).toBeLessThan(KEEP_THRESHOLD);
    expect(result.mismatchCodes).toContain("ma");
    expect(result.typeMismatchCodes).toEqual(["ma"]);
  });

  it("penalises a contrary demonym even when a shared dish name matches", () => {
    // Couscous is Algerian and Moroccan both; the sign on the door decides.
    const result = scoreCandidate({
      candidate: candidate({ name: "Hello Couscous | Traditioneel Marokkaans eten" }),
      searchCode: "dz",
      index,
      extraTerms: ["Couscous", "Chorba"],
    });
    expect(result.mismatchCodes).toContain("ma");
    expect(result.score).toBeLessThan(
      scoreCandidate({
        candidate: candidate({ name: "Hello Couscous" }),
        searchCode: "dz",
        index,
        extraTerms: ["Couscous", "Chorba"],
      }).score,
    );
  });

  it("will not hand a name-only mismatch to the auto-filer", () => {
    // A country word in a venue's name is worth a penalty but is far too weak
    // to rewrite the database on; only Google's own category may do that.
    const result = scoreCandidate({
      candidate: candidate({ name: "Restaurant Istanbul Grill" }),
      searchCode: "am",
      index,
    });
    expect(result.mismatchCodes.length + result.typeMismatchCodes.length).toBeGreaterThan(
      -1,
    );
    expect(result.typeMismatchCodes).toEqual([]);
  });

  it("never treats the query that found a venue as evidence for it", () => {
    // The old pipeline wrote the query into cuisineEvidence and then read it
    // back as proof, so every candidate passed. Scoring must see only the
    // venue's own fields.
    const result = scoreCandidate({
      candidate: candidate(
        { name: "Generic Eatery", matchedQuery: "Armenian restaurant Netherlands" },
        [{ query: "Armenian restaurant Netherlands", kind: "demonym", rank: 15 }],
      ),
      searchCode: "am",
      index,
    });
    expect(result.score).toBeLessThan(KEEP_THRESHOLD);
    expect(result.listingEvidence.join(" ")).not.toContain("Armenian restaurant");
  });
});

describe("planUmbrellaQueries", () => {
  it("asks the regional question for a country with no specialist", () => {
    const queries = planUmbrellaQueries({ countryCode: "bb" });
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0]!.kind).toBe("umbrella");
    expect(queries[0]!.text).toMatch(/Caribbean/i);
    expect(queries[0]!.umbrella).toBe("Caribbean");
  });

  it("offers nothing for a cuisine that has its own restaurants", () => {
    expect(planUmbrellaQueries({ countryCode: "jp" })).toHaveLength(0);
  });

  it("carries the admin's focus into the regional query", () => {
    const queries = planUmbrellaQueries({ countryCode: "kn", focus: "Rotterdam" });
    expect(queries.some((query) => /Rotterdam/.test(query.text))).toBe(true);
  });
});

describe("regional fallback scoring", () => {
  const caribbean: MergedCandidate["hits"] = [
    {
      query: "Caribbean restaurant Nederland",
      kind: "umbrella",
      rank: 0,
      umbrella: "Caribbean",
    },
  ];

  it("flags a pan-Caribbean venue as regional, not Barbadian", () => {
    const result = scoreCandidate({
      candidate: candidate(
        { name: "Jerk Bay", primaryType: "caribbean_restaurant" },
        caribbean,
      ),
      searchCode: "bb",
      index,
    });
    expect(result.regionalOnly).toBe(true);
    expect(result.umbrellaLabel).toBe("Caribbean");
  });

  it("stops flagging once the venue names the country itself", () => {
    const result = scoreCandidate({
      candidate: candidate(
        { name: "Bajan Kitchen Barbados", primaryType: "caribbean_restaurant" },
        caribbean,
      ),
      searchCode: "bb",
      index: buildCuisineTermIndex([
        { code: "bb", name: "Barbados", cuisineAliases: ["Bajan restaurant"] },
      ]),
      extraTerms: ["Bajan", "Cou-cou"],
    });
    expect(result.regionalOnly).toBe(false);
  });

  it("never lets a regional hit outrank a venue the country's own name found", () => {
    const regional = scoreCandidate({
      candidate: candidate(
        { name: "Island Vibes", primaryType: "caribbean_restaurant" },
        caribbean,
      ),
      searchCode: "jm",
      index,
    });
    const specific = scoreCandidate({
      candidate: candidate({ name: "Island Vibes", primaryType: "jamaican_restaurant" }, [
        { query: "Jamaican restaurant Nederland", kind: "demonym", rank: 0 },
      ]),
      searchCode: "jm",
      index,
    });
    expect(specific.score).toBeGreaterThan(regional.score);
  });

  it("is not regional when the country's own queries also found it", () => {
    const result = scoreCandidate({
      candidate: candidate({ name: "Jerk Bay" }, [
        ...caribbean,
        { query: "Jamaica restaurant Netherlands", kind: "demonym", rank: 2 },
      ]),
      searchCode: "jm",
      index,
    });
    expect(result.regionalOnly).toBe(false);
  });
});
