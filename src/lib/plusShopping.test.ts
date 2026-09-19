import { describe, expect, it } from "vitest";
import {
  buildGroceryShoppingList,
  buildPlusIngredientsDestination,
  buildPlusIngredientsHref,
  isLikelyGroceryOrderable,
} from "./plusShopping";

describe("plusShopping", () => {
  it("skips pantry staples by default", () => {
    expect(
      isLikelyGroceryOrderable({ name: "water", quantity: 200, unit: "ml" }),
    ).toBe(false);
    expect(
      isLikelyGroceryOrderable({ name: "tomaat", quantity: 2, unit: "stuks" }),
    ).toBe(true);
  });

  it("builds a PLUS search deep link for the first shoppable ingredient", () => {
    const url = buildPlusIngredientsDestination([
      { name: "zout", quantity: 1, unit: "tl" },
      { name: "olijfolie", quantity: 2, unit: "el" },
    ]);
    expect(url).toBe(
      "https://www.plus.nl/zoekresultaten?SearchTerm=olijfolie",
    );
  });

  it("formats a shopping list", () => {
    expect(
      buildGroceryShoppingList([
        { name: "ui", quantity: 1, unit: "stuk" },
        { name: "olijfolie", quantity: 2, unit: "el", note: "extra virgin" },
      ]),
    ).toBe("1 stuk ui\n2 el olijfolie (extra virgin)");
  });

  it("returns a direct PLUS URL when marketing is off", () => {
    const href = buildPlusIngredientsHref({
      ingredients: [{ name: "melk", quantity: 1, unit: "l" }],
      marketingAllowed: false,
    });
    expect(href).toBe("https://www.plus.nl/zoekresultaten?SearchTerm=melk");
  });
});
