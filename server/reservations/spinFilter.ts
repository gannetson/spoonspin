/**
 * Optional reservation-aware dine filters for a future “tonight / party size” mode.
 * Default spin/dine behaviour must ignore these — never require availability.
 */

export type DineReservationPreference = {
  date?: string;
  time?: string;
  partySize?: number;
  /** When true, keep only restaurants whose best option is live RESERVE. Off by default. */
  requireConfirmedAvailability?: boolean;
};

export type ReservationAwareCandidate = {
  restaurantId: string;
  bestAction: "RESERVE" | "BOOK_EXTERNALLY" | "VISIT_WEBSITE" | "VIEW_ON_MAP" | null;
};

/**
 * Filter a narrowed candidate pool. Safe no-op when preference is empty or providers fail.
 * Call only after cuisine/distance filtering — never against the full catalog.
 */
export function applyOptionalReservationFilter(
  candidates: ReservationAwareCandidate[],
  preference?: DineReservationPreference | null,
): ReservationAwareCandidate[] {
  if (!preference?.requireConfirmedAvailability) return candidates;
  const withReserve = candidates.filter((c) => c.bestAction === "RESERVE");
  // If nothing has live availability, keep the original pool (spin/dine must not break).
  return withReserve.length > 0 ? withReserve : candidates;
}
