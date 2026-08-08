import { describe, expect, it } from "vitest";
import {
  drinkMatchesAlcohol,
  groupDrinksIntoSections,
  recipeMatchesDiet,
} from "./menuAccessors";
import type { Drink, Recipe } from "@/types/content";

const sample = (
  name: string,
  type: Drink["type"],
  alcoholic: boolean,
): Drink => ({
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
  steps: [
    "Step one goes here.",
    "Step two goes here.",
    "Step three goes here.",
  ],
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
    expect(sections[0]?.drinks.map((d) => d.name)).toEqual([
      "Chocomel",
      "Espresso",
    ]);
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
