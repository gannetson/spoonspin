import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  findMatchingVenue,
  isSameVenue,
  nameSimilarity,
  normalizeVenueName,
} from "./venueMatch.ts";

describe("normalizeVenueName", () => {
  it("drops accents, punctuation and filler words", () => {
    expect(normalizeVenueName("Restaurant Café De Zwaan")).toBe("zwaan");
    expect(normalizeVenueName("Pho & Co.")).toBe("pho co");
    expect(normalizeVenueName("Ristorante Da Müller")).toBe("da muller");
  });
});

describe("nameSimilarity", () => {
  it("is 1 for the same name once normalized and high when one contains the other", () => {
    expect(nameSimilarity("Bavet", "BAVET Restaurant")).toBe(1);
    expect(nameSimilarity("Bavet", "Bavet Aachen")).toBeGreaterThanOrEqual(0.9);
  });

  it("is low for different names", () => {
    expect(nameSimilarity("Tanuki Sushi", "Golden Dragon")).toBe(0);
    expect(nameSimilarity("Thai Orchid", "Thai Garden")).toBeLessThan(0.6);
  });
});

describe("isSameVenue", () => {
  const here = { lat: 50.7753, lng: 6.0839 };
  const metresNorth = (m: number) => ({ lat: here.lat + m / 111_320, lng: here.lng });

  it("matches the same name a few metres apart", () => {
    expect(
      isSameVenue(
        { name: "Bavet", ...here },
        { name: "Restaurant Bavet", ...metresNorth(20) },
      ),
    ).toBe(true);
  });

  it("accepts a looser name only when very close", () => {
    // Half the words in common: enough next door, not enough 100 m away.
    const a = { name: "Thai Orchid", ...here };
    expect(isSameVenue(a, { name: "Thai Palace", ...metresNorth(15) })).toBe(true);
    expect(isSameVenue(a, { name: "Thai Palace", ...metresNorth(100) })).toBe(false);
    // A name wholly contained in the other counts as the same venue up to 150 m.
    expect(
      isSameVenue(
        { name: "Thai Orchid House", ...here },
        { name: "Orchid", ...metresNorth(100) },
      ),
    ).toBe(true);
  });

  it("never matches far apart, different names, or places without coordinates", () => {
    expect(
      isSameVenue({ name: "Bavet", ...here }, { name: "Bavet", ...metresNorth(400) }),
    ).toBe(false);
    expect(
      isSameVenue({ name: "Bavet", ...here }, { name: "Tanuki", ...metresNorth(5) }),
    ).toBe(false);
    expect(
      isSameVenue({ name: "Bavet", ...here }, { name: "Bavet", lat: null, lng: null }),
    ).toBe(false);
  });
});

describe("findMatchingVenue", () => {
  it("returns the closest matching candidate", () => {
    const place = { name: "Bavet", lat: 50.7753, lng: 6.0839 };
    const far = { id: "far", name: "Bavet", lat: 50.7753 + 100 / 111_320, lng: 6.0839 };
    const near = {
      id: "near",
      name: "Bavet Restaurant",
      lat: 50.7753 + 10 / 111_320,
      lng: 6.0839,
    };
    const other = { id: "other", name: "Tanuki", lat: 50.7753, lng: 6.0839 };
    expect(findMatchingVenue(place, [far, other, near])?.id).toBe("near");
    expect(findMatchingVenue(place, [other])).toBeUndefined();
  });

  it("measures distance in metres", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 })).toBeCloseTo(
      111.2,
      0,
    );
  });
});
