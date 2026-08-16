import { describe, expect, it } from "vitest";
import {
  drinkMatchesAlcohol,
  getDinnerSuggestion,
  groupDrinksIntoSections,
  recipeMatchesDiet,
  recipeMatchesRegion,
} from "./menuAccessors";
import type { Country, Drink, Recipe } from "@/types/content";

const sample = (name: string, type: Drink["type"], alcoholic: boolean): Drink => ({
  name,
  type,
  alcoholic,
  description: "A sample drink description for grouping tests.",
});

const recipe = (labels: string[]): Recipe => ({
  id: "r1",
  name: "Dish",
  description: "A sample recipe description used for diet filter tests only.",
  category: "main",
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 20,
  difficulty: "easy",
  dietaryLabels: labels,
  ingredients: [
    { name: "a", quantity: 1, unit: "g" },
    { name: "b", quantity: 1, unit: "g" },
  ],
  steps: ["Step one goes here.", "Step two goes here.", "Step three goes here."],
});

describe("groupDrinksIntoSections", () => {
  it("splits beers, wines, other alcoholic, and non-alcoholic", () => {
    const sections = groupDrinksIntoSections([
      sample("Heineken", "beer", true),
      sample("Riesling", "wine", true),
      sample("Jenever", "spirit", true),
      sample("Chocomel", "soft-drink", false),
      sample("Espresso", "coffee", false),
    ]);

    expect(sections.map((s) => s.id)).toEqual([
      "nonAlcoholic",
      "beers",
      "wines",
      "alcoholicOther",
    ]);
    expect(sections[0]?.drinks.map((d) => d.name)).toEqual(["Chocomel", "Espresso"]);
    expect(sections[1]?.drinks.map((d) => d.name)).toEqual(["Heineken"]);
    expect(sections[2]?.drinks.map((d) => d.name)).toEqual(["Riesling"]);
    expect(sections[3]?.drinks.map((d) => d.name)).toEqual(["Jenever"]);
  });
});

describe("drinkMatchesAlcohol", () => {
  const beer = sample("Heineken", "beer", true);
  const wine = sample("Riesling", "wine", true);
  const spirit = sample("Jenever", "spirit", true);
  const soft = sample("Chocomel", "soft-drink", false);

  it("filters beer, wine, and other alcoholic", () => {
    expect(drinkMatchesAlcohol(beer, "beer")).toBe(true);
    expect(drinkMatchesAlcohol(wine, "beer")).toBe(false);
    expect(drinkMatchesAlcohol(wine, "wine")).toBe(true);
    expect(drinkMatchesAlcohol(beer, "wine")).toBe(false);
    expect(drinkMatchesAlcohol(spirit, "other-alcoholic")).toBe(true);
    expect(drinkMatchesAlcohol(beer, "other-alcoholic")).toBe(false);
    expect(drinkMatchesAlcohol(wine, "other-alcoholic")).toBe(false);
    expect(drinkMatchesAlcohol(soft, "beer")).toBe(false);
  });
});

describe("recipeMatchesDiet", () => {
  it("supports vegan, vegetarian, and meat", () => {
    const vegan = recipe(["vegan"]);
    const vegetarian = recipe(["vegetarian"]);
    const meat = recipe(["contains-meat"]);

    expect(recipeMatchesDiet(vegan, "vegan")).toBe(true);
    expect(recipeMatchesDiet(vegetarian, "vegan")).toBe(false);
    expect(recipeMatchesDiet(vegan, "vegetarian")).toBe(true);
    expect(recipeMatchesDiet(vegetarian, "vegetarian")).toBe(true);
    expect(recipeMatchesDiet(meat, "vegetarian")).toBe(false);
    expect(recipeMatchesDiet(meat, "meat")).toBe(true);
    expect(recipeMatchesDiet(vegan, "meat")).toBe(false);
  });
});

describe("recipeMatchesRegion", () => {
  it("includes all recipes when no region is selected", () => {
    expect(recipeMatchesRegion({ ...recipe([]), regionId: "cn:sichuan" }, null)).toBe(
      true,
    );
    expect(recipeMatchesRegion(recipe([]), null)).toBe(true);
  });

  it("filters to matching region only when selected", () => {
    expect(
      recipeMatchesRegion({ ...recipe([]), regionId: "cn:sichuan" }, "cn:sichuan"),
    ).toBe(true);
    expect(
      recipeMatchesRegion({ ...recipe([]), regionId: "cn:guangdong" }, "cn:sichuan"),
    ).toBe(false);
    expect(recipeMatchesRegion(recipe([]), "cn:sichuan")).toBe(false);
  });
});

describe("getDinnerSuggestion", () => {
  const dish = (id: string, category: Recipe["category"]): Recipe => ({
    ...recipe([]),
    id,
    category,
  });

  const countryWithMenu = {
    code: "nl",
    name: "Netherlands",
    introduction: "Intro",
    menu: {
      starter: dish("starter-1", "starter"),
      main: dish("main-1", "main"),
      side: dish("side-1", "side"),
      dessert: dish("dessert-1", "dessert"),
      drink: sample("Jenever", "spirit", true),
    },
  } as Country;

  it("derives dinner drinks from the cook menu when dinner_json is missing", () => {
    const dinner = getDinnerSuggestion(countryWithMenu);
    expect(dinner?.drinks.map((item) => item.drinkName)).toEqual(["Jenever"]);
    expect(dinner?.courses).toHaveLength(4);
  });

  it("keeps drink-only dinner_json pours on derived menu courses", () => {
    const dinner = getDinnerSuggestion({
      ...countryWithMenu,
      dinner: {
        title: "Custom",
        description: "Desc",
        courses: [],
        drinks: [{ drinkName: "Heineken" }, { drinkName: "Jenever" }],
      },
    });
    expect(dinner?.courses).toHaveLength(4);
    expect(dinner?.drinks.map((item) => item.drinkName)).toEqual(["Heineken", "Jenever"]);
  });

  it("prefers stored dinner when courses exist", () => {
    const dinner = getDinnerSuggestion({
      ...countryWithMenu,
      dinner: {
        title: "Stored",
        description: "Desc",
        courses: [{ recipeId: "main-1", role: "main" }],
        drinks: [{ drinkName: "Heineken" }],
      },
    });
    expect(dinner?.title).toBe("Stored");
    expect(dinner?.courses).toHaveLength(1);
    expect(dinner?.drinks.map((item) => item.drinkName)).toEqual(["Heineken"]);
  });
});
