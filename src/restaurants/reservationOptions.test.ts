/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import {
  bookingActionLabelKey,
  resolvePrimaryBookingOption,
  secondaryBookingLinks,
  type ReservationOptionsDto,
} from "./reservationOptions";

const base: ReservationOptionsDto = {
  restaurant_id: "r1",
  requested: { date: null, time: null, party_size: null },
  best_option: {
    provider: "zenchef",
    action: "BOOK_EXTERNALLY",
    url: "https://book.zenchef.com/r/1",
  },
  alternatives: [],
  fallback: {
    provider: "website",
    action: "VISIT_WEBSITE",
    url: "https://venue.nl",
  },
  providers: [],
};

describe("reservationOptions helpers", () => {
  it("maps action label keys", () => {
    expect(bookingActionLabelKey("RESERVE")).toBe("restaurant.booking.reserve");
    expect(bookingActionLabelKey("VIEW_ON_MAP")).toBe("restaurant.booking.viewOnMap");
  });

  it("resolves primary and secondary links", () => {
    const primary = resolvePrimaryBookingOption(base);
    expect(primary?.provider).toBe("zenchef");
    const secondary = secondaryBookingLinks(base, primary);
    expect(secondary.map((s) => s.action)).toEqual(["VISIT_WEBSITE"]);
  });

  it("falls back when best_option is null", () => {
    const primary = resolvePrimaryBookingOption({
      ...base,
      best_option: null,
    });
    expect(primary?.action).toBe("VISIT_WEBSITE");
  });
});
