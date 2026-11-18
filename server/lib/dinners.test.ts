import { describe, expect, it } from "vitest";
import { needsDinner, resolvableDinnerCourses } from "./dinners.ts";
import type { Country, Recipe } from "../../src/types/content.ts";

const recipe = (id: string, category: Recipe["category"] = "main"): Recipe => ({
  id,
  name: id,
  description: `${id} is a dish with a long enough description for the schema.`,
  category,
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 20,
  difficulty: "easy",
  dietaryLabels: [],
  ingredients: [],
  steps: [],
});

function country(recipeIds: string[], courseIds: string[], withDrink = true): Country {
  return {
    code: "xx",
    name: "Xland",
    standaloneRecipes: recipeIds.map((id) => recipe(id)),
    nationalDrink: withDrink
      ? { name: "Xtea", type: "tea", alcoholic: false, description: "Tea from Xland." }
      : undefined,
    dinner: {
      title: "A dinner",
      description: "Dinner",
      courses: courseIds.map((recipeId) => ({ recipeId, role: "main" as const })),
      drinks: [],
      composedAt: "2026-01-01T00:00:00Z",
    },
  } as unknown as Country;
}

describe("dinner validity", () => {
  it("counts only courses that point at an existing recipe", () => {
    const c = country(["xx:a", "xx:b", "xx:c"], ["xx:a", "xx:b", "gone", "also-gone"]);
    expect(resolvableDinnerCourses(c)).toBe(2);
  });

  it("flags a dinner whose recipes were renamed, even though it has enough courses", () => {
    const c = country(["xx:a", "xx:b", "xx:c"], ["a", "b", "c", "d"]);
    expect(needsDinner(c)).toBe(true);
  });

  it("accepts a dinner with 3 resolvable courses", () => {
    const c = country(["xx:a", "xx:b", "xx:c"], ["xx:a", "xx:b", "xx:c"]);
    expect(needsDinner(c)).toBe(false);
  });

  it("does not ask for a dinner when there is nothing to compose it from", () => {
    expect(needsDinner(country(["xx:a", "xx:b"], []))).toBe(false);
    expect(needsDinner(country(["xx:a", "xx:b", "xx:c"], [], false))).toBe(false);
  });
});
