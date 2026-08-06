import type { Restaurant } from "./types";

export type RestaurantSortMode = "default" | "authenticity" | "rating";

const MAX_DISTANCE_FOR_SCORE_KM = 100;

function proximityScore(distanceKm: number | undefined): number {
  if (distanceKm == null) return 0.45;
  const clamped = Math.min(Math.max(distanceKm, 0), MAX_DISTANCE_FOR_SCORE_KM);
  return 1 - clamped / MAX_DISTANCE_FOR_SCORE_KM;
}

function authenticityScore(rating: number | undefined): number {
  return (rating ?? 2.5) / 5;
}

function userRatingScore(rating: number | undefined): number {
  return (rating ?? 3.2) / 5;
}

/** Balanced score: proximity + authenticity + guest rating. */
export function defaultRankScore(restaurant: Restaurant): number {
  return (
    0.4 * proximityScore(restaurant.distanceKm) +
    0.35 * authenticityScore(restaurant.authenticityRating) +
    0.25 * userRatingScore(restaurant.rating)
  );
}

function byName(a: Restaurant, b: Restaurant): number {
  return a.name.localeCompare(b.name);
}

export function sortRestaurants(
  restaurants: Restaurant[],
  mode: RestaurantSortMode,
): Restaurant[] {
  const copy = [...restaurants];

  if (mode === "authenticity") {
    return copy.sort((a, b) => {
      const diff = (b.authenticityRating ?? 0) - (a.authenticityRating ?? 0);
      if (diff !== 0) return diff;
      const dist =
        (a.distanceKm ?? Number.POSITIVE_INFINITY) -
        (b.distanceKm ?? Number.POSITIVE_INFINITY);
      if (dist !== 0) return dist;
      return byName(a, b);
    });
  }

  if (mode === "rating") {
    return copy.sort((a, b) => {
      const aRating = a.rating;
      const bRating = b.rating;
      if (aRating == null && bRating == null) return byName(a, b);
      if (aRating == null) return 1;
      if (bRating == null) return -1;
      if (bRating !== aRating) return bRating - aRating;
      const reviews = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      if (reviews !== 0) return reviews;
      return byName(a, b);
    });
  }

  return copy.sort((a, b) => {
    const diff = defaultRankScore(b) - defaultRankScore(a);
    if (Math.abs(diff) > 1e-9) return diff;
    return byName(a, b);
  });
}
