import type { Ingredient } from "@/types/content";

/**
 * Scale ingredient quantities from the recipe's original serving count.
 * Always multiply from the original quantity to avoid cumulative rounding drift.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  desiredServings: number,
): Ingredient[] {
  if (originalServings <= 0) {
    throw new Error("originalServings must be positive");
  }
  if (desiredServings <= 0) {
    throw new Error("desiredServings must be positive");
  }

  const factor = desiredServings / originalServings;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: roundQuantity(ingredient.quantity * factor),
  }));
}

function roundQuantity(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  if (value >= 1) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}

export function formatQuantity(quantity: number, unit: string): string {
  const display =
    quantity % 1 === 0 ? String(quantity) : quantity.toFixed(3).replace(/\.?0+$/, "");
  return `${display} ${unit}`.trim();
}
