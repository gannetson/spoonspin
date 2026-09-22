import type { Ingredient } from "@/types/content";
import { formatQuantity } from "@/lib/scaleIngredients";
const SKIP_BY_DEFAULT =
  /\b(water|waterstof|ijs|ice|zout|salt|peper|pepper|zwarte peper|witte peper|lucht|steam|stoom)\b/i;

export function isLikelyGroceryOrderable(ingredient: Ingredient): boolean {
  const name = ingredient.name.trim();
  if (!name) return false;
  if (SKIP_BY_DEFAULT.test(name)) return false;
  if (
    /^(zout|peper|nootmuskaat|kaneel|komijn|paprikapoeder|cayenne)$/i.test(name) &&
    ingredient.quantity > 0 &&
    ingredient.quantity <= 5 &&
    /^(g|gram|tl|el|tsp|tbsp|pinch|snufje)$/i.test(ingredient.unit.trim())
  ) {
    return false;
  }
  return true;
}

export function formatGroceryShoppingLine(ingredient: Ingredient): string {
  const name = ingredient.name.trim();
  const note = ingredient.note?.trim() ? ` (${ingredient.note.trim()})` : "";
  const hasAmount =
    Boolean(ingredient.unit.trim()) ||
    (Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);
  if (!hasAmount) return `${name}${note}`.trim();
  const qty = formatQuantity(ingredient.quantity, ingredient.unit);
  return `${qty} ${name}${note}`.trim();
}

export function groceryItemsForShoppingList(ingredients: Ingredient[]): Ingredient[] {
  const shoppable = ingredients.filter(isLikelyGroceryOrderable);
  return shoppable.length > 0 ? shoppable : ingredients;
}

export function shoppingListItemKey(ingredient: Ingredient, index: number): string {
  return `${index}:${ingredient.name}:${ingredient.unit}`;
}

export function buildGroceryShoppingList(ingredients: Ingredient[]): string {
  return groceryItemsForShoppingList(ingredients)
    .map(formatGroceryShoppingLine)
    .join("\n");
}

export function formatShoppingListShareText(input: {
  title: string;
  ingredients: Ingredient[];
}): string {
  const heading = input.title.trim();
  const lines = input.ingredients.map((item) => `• ${formatGroceryShoppingLine(item)}`);
  if (lines.length === 0) return heading;
  return `${heading}\n\n${lines.join("\n")}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
