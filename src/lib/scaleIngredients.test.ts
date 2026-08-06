import { describe, expect, it } from "vitest";
import { scaleIngredients } from "@/lib/scaleIngredients";

describe("scaleIngredients", () => {
  const ingredients = [
    { name: "flour", quantity: 200, unit: "g" },
    { name: "milk", quantity: 0.5, unit: "l" },
    { name: "eggs", quantity: 3, unit: "pieces" },
  ];

  it("scales from the original servings without cumulative drift", () => {
    const toSix = scaleIngredients(ingredients, 4, 6);
    expect(toSix[0]?.quantity).toBe(300);
    expect(toSix[1]?.quantity).toBe(0.75);
    expect(toSix[2]?.quantity).toBe(4.5);

    const backToFour = scaleIngredients(ingredients, 4, 4);
    expect(backToFour.map((i) => i.quantity)).toEqual([200, 0.5, 3]);

    const toEight = scaleIngredients(ingredients, 4, 8);
    expect(toEight[0]?.quantity).toBe(400);
  });

  it("rejects non-positive servings", () => {
    expect(() => scaleIngredients(ingredients, 0, 4)).toThrow();
    expect(() => scaleIngredients(ingredients, 4, 0)).toThrow();
  });
});
