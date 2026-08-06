import { describe, expect, it } from "vitest";
import {
  aggregateGuestRating,
  listSourceRatings,
  normalizeToFive,
} from "./ratings";

describe("restaurant ratings", () => {
  it("normalizes The Fork /10 scores to a 5-point scale", () => {
    expect(normalizeToFive({ score: 9.0, scale: 10 })).toBe(4.5);
  });

  it("aggregates multi-source ratings with review-volume weighting", () => {
    const aggregated = aggregateGuestRating({
      google: { score: 4.6, count: 400 },
      theFork: { score: 9.0, scale: 10, count: 80 },
      tripadvisor: { score: 4.0, count: 120 },
    });
    expect(aggregated.rating).toBeGreaterThan(4);
    expect(aggregated.rating).toBeLessThan(5);
    expect(aggregated.reviewCount).toBe(600);
  });

  it("lists sources in display order", () => {
    const listed = listSourceRatings({
      tripadvisor: { score: 4.2, count: 10 },
      google: { score: 4.5, count: 20 },
    });
    expect(listed.map((item) => item.source)).toEqual([
      "google",
      "tripadvisor",
    ]);
  });
});
