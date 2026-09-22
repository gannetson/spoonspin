import { describe, expect, it } from "vitest";
import {
  buildGroceryShoppingList,
  formatGroceryShoppingLine,
  formatShoppingListShareText,
  isLikelyGroceryOrderable,
} from "./shoppingList";

describe("shoppingList", () => {
  it("skips pantry staples by default", () => {
    expect(isLikelyGroceryOrderable({ name: "water", quantity: 200, unit: "ml" })).toBe(
      false,
    );
    expect(isLikelyGroceryOrderable({ name: "tomaat", quantity: 2, unit: "stuks" })).toBe(
      true,
    );
  });

  it("formats a shopping list without pantry staples", () => {
    expect(
      buildGroceryShoppingList([
        { name: "water", quantity: 200, unit: "ml" },
        { name: "ui", quantity: 1, unit: "stuk" },
        { name: "olijfolie", quantity: 2, unit: "el", note: "extra virgin" },
      ]),
    ).toBe("1 stuk ui\n2 el olijfolie (extra virgin)");
  });

  it("prefixes the recipe title when sharing", () => {
    expect(
      formatShoppingListShareText({
        title: "Fërgesë",
        ingredients: [
          { name: "red peppers", quantity: 4, unit: "pieces" },
          { name: "cottage cheese", quantity: 250, unit: "g" },
        ],
      }),
    ).toBe("Fërgesë\n\n• 4 pieces red peppers\n• 250 g cottage cheese");
  });

  it("formats a custom item without a fake quantity", () => {
    expect(formatGroceryShoppingLine({ name: "melk", quantity: 0, unit: "" })).toBe(
      "melk",
    );
  });
});
