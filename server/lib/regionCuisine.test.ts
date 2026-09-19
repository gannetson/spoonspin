import { describe, expect, it } from "vitest";
import { buildRegionTermIndex, detectRegion } from "./regionCuisine.ts";

const CN_REGIONS = [
  { id: "cn:CN-GD", name: "Guangdong", isoCode: "CN-GD" },
  { id: "cn:CN-SC", name: "Sichuan", isoCode: "CN-SC" },
  { id: "cn:CN-SH", name: "Shanghai", isoCode: "CN-SH" },
  { id: "cn:CN-XJ", name: "Xinjiang", isoCode: "CN-XJ" },
];
const cn = buildRegionTermIndex("cn", CN_REGIONS);

const TR_REGIONS = [
  { id: "tr:TR-AKD", name: "Mediterranean", isoCode: "TR-AKD" },
  { id: "tr:TR-GDA", name: "Southeastern Anatolia", isoCode: "TR-GDA" },
];
const tr = buildRegionTermIndex("tr", TR_REGIONS);

const TH_REGIONS = [
  { id: "th:TH-ISN", name: "Isan", isoCode: "TH-ISN" },
  { id: "th:TH-NTH", name: "Northern", isoCode: "TH-NTH" },
];
const th = buildRegionTermIndex("th", TH_REGIONS);

describe("detectRegion", () => {
  it("reads the region straight off the venue name", () => {
    expect(detectRegion({ text: "Sichuan Food", index: cn })?.regionId).toBe("cn:CN-SC");
  });

  it("understands the cuisine demonym rather than the province name", () => {
    // Nobody writes "Guangdong" on a sign; they write "Cantonese".
    expect(
      detectRegion({ text: "Oriental City — Cantonese kitchen", index: cn }),
    ).toEqual({ regionId: "cn:CN-GD", matchedTerm: "cantonese" });
  });

  it("handles historical romanisations", () => {
    expect(detectRegion({ text: "Szechuan Palace", index: cn })?.regionId).toBe(
      "cn:CN-SC",
    );
  });

  it("stays unassigned when a menu spans several regions", () => {
    // A place listing both is a general Chinese restaurant; picking one would
    // file it where a diner looking for that region would not want it.
    expect(
      detectRegion({ text: "Cantonese and Sichuanese specialities", index: cn }),
    ).toBeUndefined();
  });

  it("finds nothing in a venue with no regional claim", () => {
    expect(
      detectRegion({ text: "Golden Dragon Chinese Restaurant", index: cn }),
    ).toBeUndefined();
  });

  it("never matches a region whose name is a pan-cuisine label", () => {
    // Turkey is catalogued with a region called "Mediterranean", which matched
    // a Bosnian grill and a mezze bar on the bare word alone.
    expect(
      detectRegion({ text: "Mostar Grill — mediterranean food", index: tr }),
    ).toBeUndefined();
    expect(
      detectRegion({ text: "middleat mediterranean restaurant", index: tr }),
    ).toBeUndefined();
  });

  it("still reaches such a region through a curated alias", () => {
    expect(detectRegion({ text: "Antalya Pide Salonu", index: tr })?.regionId).toBe(
      "tr:TR-AKD",
    );
  });

  it("never matches a region named only for a compass direction", () => {
    expect(detectRegion({ text: "Northern Star Cafe", index: th })).toBeUndefined();
  });

  it("matches a culinary macro-region by its real name", () => {
    expect(detectRegion({ text: "Isan Thai Kitchen", index: th })?.regionId).toBe(
      "th:TH-ISN",
    );
  });

  it("matches whole words only", () => {
    expect(detectRegion({ text: "Shanghainese dumplings", index: cn })?.regionId).toBe(
      "cn:CN-SH",
    );
    // "Xinjiang" must not fire on an unrelated substring.
    expect(detectRegion({ text: "Xin Jiang Lu street food", index: cn })).toBeUndefined();
  });

  it("only indexes regions the database actually holds", () => {
    // region_id is a foreign key; detecting an unstorable region is worse than
    // detecting nothing.
    const partial = buildRegionTermIndex("cn", [
      { id: "cn:CN-SC", name: "Sichuan", isoCode: "CN-SC" },
    ]);
    expect(
      detectRegion({ text: "Cantonese roast duck", index: partial }),
    ).toBeUndefined();
    expect(detectRegion({ text: "Szechuan hotpot", index: partial })?.regionId).toBe(
      "cn:CN-SC",
    );
  });

  it("prefers the more specific of two nested region names", () => {
    // "Baja California Sur" also contains "Baja California"; the longer,
    // more specific region should win instead of the pair cancelling out.
    const mx = buildRegionTermIndex("mx", [
      { id: "mx:MX-BCN", name: "Baja California", isoCode: "MX-BCN" },
      { id: "mx:MX-BCS", name: "Baja California Sur", isoCode: "MX-BCS" },
    ]);
    expect(detectRegion({ text: "Baja California Sur seafood", index: mx })).toEqual({
      regionId: "mx:MX-BCS",
      matchedTerm: "baja california sur",
    });
    expect(detectRegion({ text: "Baja California tacos", index: mx })?.regionId).toBe(
      "mx:MX-BCN",
    );
  });

  it("ignores text with no regional words at all", () => {
    expect(detectRegion({ text: "", index: cn })).toBeUndefined();
  });
});
