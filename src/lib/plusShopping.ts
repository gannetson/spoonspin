import type { Ingredient } from "@/types/content";
import { formatQuantity } from "@/lib/scaleIngredients";
import { wrapPlusAffiliateUrl } from "@/restaurants/affiliateLinks";

/** PLUS online grocery / search entry points. */
export const PLUS_HOME_URL = "https://www.plus.nl/bestellen";
export const PLUS_SEARCH_BASE = "https://www.plus.nl/zoekresultaten";

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
  const qty = formatQuantity(ingredient.quantity, ingredient.unit);
  const note = ingredient.note?.trim() ? ` (${ingredient.note.trim()})` : "";
  return `${qty} ${ingredient.name.trim()}${note}`.trim();
}

export function buildGroceryShoppingList(ingredients: Ingredient[]): string {
  return ingredients.map(formatGroceryShoppingLine).join("\n");
}

/**
 * Deep-link destination on plus.nl: product search results for the first
 * shoppable ingredient (`/zoekresultaten?SearchTerm=…`). Fall back to the
 * online-ordering hub.
 */
export function buildPlusIngredientsDestination(
  ingredients: Ingredient[],
): string {
  const primary =
    ingredients.find(isLikelyGroceryOrderable)?.name.trim() ||
    ingredients[0]?.name.trim();
  if (primary) {
    const url = new URL(PLUS_SEARCH_BASE);
    url.searchParams.set("SearchTerm", primary);
    return url.toString();
  }
  return PLUS_HOME_URL;
}

export function buildPlusIngredientsHref(input: {
  ingredients: Ingredient[];
  marketingAllowed: boolean;
  clickref?: string;
}): string {
  const destination = buildPlusIngredientsDestination(input.ingredients);
  return wrapPlusAffiliateUrl(destination, {
    marketingAllowed: input.marketingAllowed,
    clickref: input.clickref,
  });
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
