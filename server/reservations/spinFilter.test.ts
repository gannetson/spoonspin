/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { applyOptionalReservationFilter } from "./spinFilter";

describe("applyOptionalReservationFilter", () => {
  const pool = [
    { restaurantId: "a", bestAction: "VISIT_WEBSITE" as const },
    { restaurantId: "b", bestAction: "RESERVE" as const },
    { restaurantId: "c", bestAction: "BOOK_EXTERNALLY" as const },
  ];

  it("is a no-op by default", () => {
    expect(applyOptionalReservationFilter(pool)).toEqual(pool);
    expect(applyOptionalReservationFilter(pool, {})).toEqual(pool);
  });

  it("can narrow to confirmed availability without emptying the pool on miss", () => {
    expect(
      applyOptionalReservationFilter(pool, { requireConfirmedAvailability: true }),
    ).toEqual([{ restaurantId: "b", bestAction: "RESERVE" }]);

    expect(
      applyOptionalReservationFilter(
        [{ restaurantId: "a", bestAction: "VISIT_WEBSITE" }],
        { requireConfirmedAvailability: true },
      ),
    ).toEqual([{ restaurantId: "a", bestAction: "VISIT_WEBSITE" }]);
  });
});
