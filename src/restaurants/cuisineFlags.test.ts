import { describe, expect, it } from "vitest";
import {
  cuisineFlagsFor,
  matchMenuItemNationalDishes,
} from "@/restaurants/cuisineFlags";
import { formatPriceLevel } from "@/restaurants/ratings";

describe("cuisineFlagsFor", () => {
  it("maps known cuisine codes to flags", () => {
    const flags = cuisineFlagsFor(["it", "ge", "zz"]);
    expect(flags.map((f) => f.code)).toEqual(["it", "ge"]);
    expect(flags[0]?.flag).toBeTruthy();
  });
});

describe("matchMenuItemNationalDishes", () => {
  it("flags menu items that match national dishes", () => {
    const matches = matchMenuItemNationalDishes(
      { id: "khinkali", name: "Khinkali" },
      ["ge"],
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.code).toBe("ge");
  });

  it("returns empty when no cuisine codes", () => {
    expect(
      matchMenuItemNationalDishes({ id: "x", name: "Khinkali" }, []),
    ).toEqual([]);
  });

  it("prefers AI-assigned cuisine codes on the menu item", () => {
    const matches = matchMenuItemNationalDishes(
      {
        id: "injera",
        name: "House salad",
        cuisineCodes: ["et"],
      },
      ["ge"],
    );
    expect(matches.map((m) => m.code)).toEqual(["et"]);
  });
});

describe("formatPriceLevel", () => {
  it("renders euro symbols", () => {
    expect(formatPriceLevel(1)).toBe("€");
    expect(formatPriceLevel(3)).toBe("€€€");
    expect(formatPriceLevel(undefined)).toBeNull();
  });
});

describe("stableMapsUrl", () => {
  it("replaces dead goo.gl short links with a search URL", async () => {
    const { stableMapsUrl, isUnstableMapsShortUrl } = await import(
      "@/restaurants/utils"
    );
    expect(isUnstableMapsShortUrl("https://goo.gl/maps/7gR6H1q7G8y")).toBe(
      true,
    );
    const url = stableMapsUrl("https://goo.gl/maps/7gR6H1q7G8y", {
      name: "Restaurante O Pescador",
      address: "Lange Leidsedwarsstraat 78",
      city: "Amsterdam",
    });
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain(encodeURIComponent("Restaurante O Pescador"));
  });
});
