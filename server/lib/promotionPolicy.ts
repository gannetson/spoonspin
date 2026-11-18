/**
 * Which harvested restaurants may be promoted, and what enrichment may invent for them.
 *
 * Overture places are category-based and unverified. Without a website there is no page
 * to check the cuisine against, so the cuisine check cannot catch a wrong category, and
 * the menu and scores steps would have nothing to read and fill in typical dishes and
 * estimated numbers instead. So:
 *
 *  - an Overture place is promoted only when it has a website;
 *  - a machine-promoted place (review source "gather-agent") whose page could not be read
 *    gets no researched menu and no estimated scores. Its photo, text and any real
 *    Google/Tripadvisor rating still apply.
 *
 * Hand-reviewed, curated and admin-added restaurants are never affected.
 */
import type { StoredRestaurant } from "../db/restaurants.ts";

export const OVERTURE_SOURCE = "overture";
export const GATHER_REVIEW_SOURCE = "gather-agent";

const hasWebsite = (website: string | null | undefined) => Boolean(website?.trim());

/** True when a harvested, unreviewed place may be promoted. */
export function canPromote(
  restaurant: Pick<StoredRestaurant, "source" | "website">,
  options: { allowOvertureWithoutWebsite?: boolean } = {},
): boolean {
  if (restaurant.source !== OVERTURE_SOURCE) return true;
  return options.allowOvertureWithoutWebsite === true || hasWebsite(restaurant.website);
}

/**
 * True when the menu and estimated scores must be skipped: a machine-promoted place
 * whose own page was not read (no website, or the site could not be fetched).
 */
export function skipsResearchedMenuAndScores(
  restaurant: Pick<StoredRestaurant, "reviewSource">,
  hadPageEvidence: boolean,
): boolean {
  return restaurant.reviewSource === GATHER_REVIEW_SOURCE && !hadPageEvidence;
}
