import type { Recipe } from "@/types/content";
import { SITE_ORIGIN } from "./documentMeta";

function upsertJsonLd(id: string, data: unknown): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
}

export function clearSeoJsonLd(): void {
  removeJsonLd("spoonspin-ld-website");
  removeJsonLd("spoonspin-ld-webpage");
  removeJsonLd("spoonspin-ld-recipe");
}

function minutesToIso8601(minutes: number): string | undefined {
  if (!(minutes > 0)) return undefined;
  return `PT${Math.round(minutes)}M`;
}

export function setWebsiteJsonLd(description: string): void {
  upsertJsonLd("spoonspin-ld-website", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: "Spoonspin",
        url: `${SITE_ORIGIN}/`,
        description,
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "Spoonspin",
        url: `${SITE_ORIGIN}/`,
        description,
      },
    ],
  });
  removeJsonLd("spoonspin-ld-webpage");
  removeJsonLd("spoonspin-ld-recipe");
}

export function setCountryWebPageJsonLd(input: {
  name: string;
  description: string;
  countryCode: string;
}): void {
  const url = `${SITE_ORIGIN}/?country=${encodeURIComponent(input.countryCode.toLowerCase())}`;
  upsertJsonLd("spoonspin-ld-webpage", {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
  });
  removeJsonLd("spoonspin-ld-recipe");
}

export function setRecipeJsonLd(input: {
  recipe: Recipe;
  countryName: string;
  countryCode: string;
}): void {
  const { recipe, countryName, countryCode } = input;
  const url = `${SITE_ORIGIN}/?country=${encodeURIComponent(countryCode.toLowerCase())}&recipe=${encodeURIComponent(recipe.id)}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.name,
    description: recipe.description,
    url,
    recipeYield: String(recipe.servings),
    recipeCategory: recipe.category,
    recipeCuisine: countryName,
    recipeIngredient: recipe.ingredients.map((item) => {
      const qty = `${item.quantity} ${item.unit}`.trim();
      const note = item.note ? ` (${item.note})` : "";
      return `${qty} ${item.name}${note}`.trim();
    }),
    recipeInstructions: recipe.steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
  };

  if (recipe.imageUrl) {
    data.image = [recipe.imageUrl];
  }
  const prep = minutesToIso8601(recipe.prepMinutes);
  if (prep) data.prepTime = prep;
  const cook = minutesToIso8601(recipe.cookMinutes);
  if (cook) data.cookTime = cook;
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
  const total = minutesToIso8601(totalMinutes);
  if (total) data.totalTime = total;

  upsertJsonLd("spoonspin-ld-recipe", data);
}
