/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchReservationOptions,
  recordReservationClick,
} from "./client";

describe("reservation client API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches reservation options with query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        restaurant_id: "r1",
        requested: { date: "2026-09-19", time: "19:30", party_size: 4 },
        best_option: {
          provider: "website",
          action: "VISIT_WEBSITE",
          url: "https://venue.nl",
        },
        alternatives: [],
        fallback: {
          provider: "website",
          action: "VISIT_WEBSITE",
          url: "https://venue.nl",
        },
        providers: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchReservationOptions("r1", {
      date: "2026-09-19",
      time: "19:30",
      partySize: 4,
    });
    expect(data.best_option?.action).toBe("VISIT_WEBSITE");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/restaurants/r1/reservation-options?date=2026-09-19&time=19%3A30&party_size=4",
      { credentials: "same-origin" },
    );
  });

  it("records reservation clicks and returns referral id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ referral_id: "ref-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const id = await recordReservationClick({
      restaurantId: "r1",
      provider: "thefork",
      partySize: 2,
    });
    expect(id).toBe("ref-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/restaurants/r1/reservation-clicks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          provider: "thefork",
          party_size: 2,
          requested_date: undefined,
          requested_time: undefined,
        }),
      }),
    );
  });

  it("returns null when click tracking fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      recordReservationClick({ restaurantId: "r1", provider: "zenchef" }),
    ).resolves.toBeNull();
  });
});
