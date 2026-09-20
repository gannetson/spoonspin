import { describe, expect, it } from "vitest";
import {
  bestMatch,
  buildCountryNameIndex,
  groupByVenue,
  matchLevelFromLabel,
  parseRestaurantSheet,
  venueKey,
} from "./restaurantSheet.ts";

const HEADER = [
  "Keukenland",
  "Restaurant",
  "Plaats",
  "Vestigingsland",
  "Keuken / regio",
  "Match",
  "URL",
  "Bron / controle",
];

function sheet(...rows: string[][]): string[][] {
  return [["Restaurants per land"], ["Bijgewerkt"], ["Match: …"], HEADER, ...rows];
}

describe("buildCountryNameIndex", () => {
  it("resolves Dutch country names", () => {
    const index = buildCountryNameIndex();
    expect(index.get("algerije")).toBe("dz");
    expect(index.get("armenie")).toBe("am");
    expect(index.get("barbados")).toBe("bb");
  });

  it("resolves English names too, so a translated sheet still imports", () => {
    const index = buildCountryNameIndex();
    expect(index.get("algeria")).toBe("dz");
    expect(index.get("china")).toBe("cn");
  });

  it("covers the spellings CLDR does not use", () => {
    // The sheet writes "Myanmar", "Palestina" and "Slovakije"; Dutch CLDR says
    // "Myanmar (Birma)", "Palestijnse gebieden" and "Slowakije".
    const index = buildCountryNameIndex();
    expect(index.get("myanmar")).toBe("mm");
    expect(index.get("palestina")).toBe("ps");
    expect(index.get("slovakije")).toBe("sk");
  });
});

describe("matchLevelFromLabel", () => {
  it("maps the sheet's own vocabulary", () => {
    expect(matchLevelFromLabel("Land")).toBe("country");
    expect(matchLevelFromLabel("Regio")).toBe("regional");
    expect(matchLevelFromLabel("Geïnspireerd")).toBe("inspired");
  });

  it("treats an unfamiliar label as regional rather than a specialist", () => {
    expect(matchLevelFromLabel("iets anders")).toBe("regional");
    expect(matchLevelFromLabel(undefined)).toBe("regional");
  });
});

describe("parseRestaurantSheet", () => {
  it("reads listings under a header that is not the first row", () => {
    const result = parseRestaurantSheet(
      sheet([
        "Algerije",
        "Raïnaraï",
        "Amsterdam",
        "Nederland",
        "Algerije",
        "Land",
        "https://www.rainarai.nl/",
        "PDF-selectie",
      ]),
    );
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      countryCode: "dz",
      name: "Raïnaraï",
      city: "Amsterdam",
      match: "country",
      url: "https://www.rainarai.nl/",
    });
  });

  it("finds columns by name, so reordering the sheet does not break it", () => {
    const rows = [
      ["Restaurant", "Plaats", "Match", "Keukenland"],
      ["Kavkaz", "Leiden", "Land", "Armenië"],
    ];
    const result = parseRestaurantSheet(rows);
    expect(result.listings[0]).toMatchObject({ countryCode: "am", name: "Kavkaz" });
  });

  it("reports an unknown country instead of dropping it silently", () => {
    const result = parseRestaurantSheet(
      sheet([
        "Atlantis",
        "Poseidon",
        "Amsterdam",
        "Nederland",
        "Atlantis",
        "Land",
        "",
        "",
      ]),
    );
    expect(result.listings).toHaveLength(0);
    expect(result.unknownCountries).toEqual(["Atlantis"]);
    expect(result.skipped[0]?.reason).toContain("Atlantis");
  });

  it("skips a row with no city rather than storing a venue nobody can find", () => {
    const result = parseRestaurantSheet(
      sheet(["Algerije", "Ergens", "", "Nederland", "Algerije", "Land", "", ""]),
    );
    expect(result.listings).toHaveLength(0);
    expect(result.skipped[0]?.reason).toContain("city");
  });

  it("ignores blank spacer rows", () => {
    const result = parseRestaurantSheet(sheet([], ["", "", "", "", "", "", "", ""]));
    expect(result.listings).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it("refuses a sheet with no recognisable header", () => {
    expect(() =>
      parseRestaurantSheet([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toThrow(/header row/i);
  });
});

describe("groupByVenue", () => {
  const listings = parseRestaurantSheet(
    sheet(
      [
        "Nigeria",
        "African Kitchen",
        "Den Haag",
        "Nederland",
        "West-Afrika",
        "Regio",
        "https://x.test/",
        "note A",
      ],
      [
        "Ghana",
        "African Kitchen",
        "Den Haag",
        "Nederland",
        "West-Afrika",
        "Regio",
        "",
        "note B",
      ],
      [
        "Ghana",
        "African Kitchen",
        "Den Haag",
        "Nederland",
        "West-Afrika",
        "Regio",
        "",
        "note B",
      ],
      [
        "Algerije",
        "Raïnaraï",
        "Amsterdam",
        "Nederland",
        "Algerije",
        "Land",
        "",
        "note C",
      ],
    ),
  ).listings;

  it("collapses one venue that stands in for several cuisines", () => {
    // The sheet repeats a venue per country on purpose; grounding and storing
    // it once per row would mean duplicate lookups and duplicate rows.
    const venues = groupByVenue(listings);
    expect(venues).toHaveLength(2);
    const african = venues.find((v) => v.name === "African Kitchen")!;
    expect(african.cuisines.map((c) => c.countryCode).sort()).toEqual(["gh", "ng"]);
  });

  it("keeps the first URL and collects distinct notes", () => {
    const african = groupByVenue(listings).find((v) => v.name === "African Kitchen")!;
    expect(african.url).toBe("https://x.test/");
    expect(african.notes).toEqual(["note A", "note B"]);
  });

  it("reports the strongest match a venue carries", () => {
    const venues = groupByVenue(listings);
    expect(bestMatch(venues.find((v) => v.name === "African Kitchen")!)).toBe("regional");
    expect(bestMatch(venues.find((v) => v.name === "Raïnaraï")!)).toBe("country");
  });

  it("keys venues case- and accent-insensitively", () => {
    expect(venueKey("Raïnaraï", "Amsterdam")).toBe(venueKey("RAINARAI", " amsterdam "));
  });
});
