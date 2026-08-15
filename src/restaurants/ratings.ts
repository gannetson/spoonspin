export type RatingSourceId = "google" | "theFork" | "tripadvisor" | "openTable";

export type SourceRating = {
  /** Raw score on the source's scale (default 5; The Fork often uses 10). */
  score?: number;
  count?: number;
  scale?: 5 | 10;
  url?: string;
  fetchedAt?: string;
};

export type RestaurantRatings = Partial<Record<RatingSourceId, SourceRating>>;

export const RATING_SOURCE_LABELS: Record<RatingSourceId, string> = {
  google: "Google",
  theFork: "The Fork",
  tripadvisor: "Tripadvisor",
  openTable: "OpenTable",
};

export function normalizeToFive(rating: SourceRating): number {
  const score = rating.score;
  if (score == null || !Number.isFinite(score)) return 0;
  const scale = rating.scale ?? 5;
  if (scale <= 0) return 0;
  return (score / scale) * 5;
}

/** Weight by log review volume so large samples count more, without drowning small ones. */
function sourceWeight(rating: SourceRating): number {
  return Math.log10((rating.count ?? 0) + 10);
}

export function aggregateGuestRating(ratings?: RestaurantRatings | null): {
  rating?: number;
  reviewCount?: number;
} {
  if (!ratings) return {};
  const entries = (
    Object.entries(ratings) as Array<[RatingSourceId, SourceRating]>
  ).filter(
    ([, value]) => value != null && value.score != null && Number.isFinite(value.score),
  );

  if (entries.length === 0) return {};

  let weighted = 0;
  let weightSum = 0;
  let reviewCount = 0;

  for (const [, value] of entries) {
    const weight = sourceWeight(value);
    weighted += normalizeToFive(value) * weight;
    weightSum += weight;
    reviewCount += value.count ?? 0;
  }

  if (weightSum === 0) return {};

  return {
    rating: Math.round((weighted / weightSum) * 10) / 10,
    reviewCount: reviewCount > 0 ? reviewCount : undefined,
  };
}

export function listSourceRatings(ratings?: RestaurantRatings | null): Array<{
  source: RatingSourceId;
  label: string;
  rating: SourceRating & { score: number };
}> {
  if (!ratings) return [];
  const order: RatingSourceId[] = ["google", "theFork", "tripadvisor", "openTable"];
  return order.flatMap((source) => {
    const rating = ratings[source];
    if (rating?.score == null || !Number.isFinite(rating.score)) return [];
    return [
      {
        source,
        label: RATING_SOURCE_LABELS[source],
        rating: { ...rating, score: rating.score },
      },
    ];
  });
}

/** Render price level 1–4 as €–€€€€. */
export function formatPriceLevel(level: 1 | 2 | 3 | 4 | null | undefined): string | null {
  if (level == null || level < 1 || level > 4) return null;
  return "€".repeat(level);
}

export { listReviewLinks, type ReviewLink } from "./reviewLinks";
