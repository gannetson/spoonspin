import { beforeEach, describe, expect, it } from "vitest";
import { cuisineFlagsFor, matchMenuItemNationalDishes } from "@/restaurants/cuisineFlags";
import { formatPriceLevel } from "@/restaurants/ratings";
import { setRuntimeCountries } from "@/content/countries";
import type { Country } from "@/types/content";

const geFixture: Country = {
  code: "ge",
  slug: "georgia",
  name: "Georgia",
  flag: "🇬🇪",
  region: "Europe",
  introduction: "Georgian cuisine fixture for tests.",
  cuisineAliases: ["Georgian restaurant"],
  nationalDishId: "khinkali",
  cookReady: true,
  status: "published",
  menu: {
    starter: {
      id: "pkhali",
      name: "Pkhali",
      description: "Vegetable pâté starter used in tests only.",
      category: "starter",
      servings: 4,
      prepMinutes: 20,
      cookMinutes: 10,
      difficulty: "easy",
      dietaryLabels: ["vegetarian"],
      ingredients: [
        { name: "spinach", quantity: 1, unit: "bunch" },
        { name: "walnuts", quantity: 100, unit: "g" },
      ],
      steps: ["Chop", "Mix", "Serve"],
    },
    main: {
      id: "khinkali",
      name: "Khinkali",
      description: "Dumplings used as the national dish in this fixture.",
      category: "main",
      servings: 4,
      prepMinutes: 45,
      cookMinutes: 20,
      difficulty: "medium",
      dietaryLabels: ["contains-meat"],
      ingredients: [
        { name: "flour", quantity: 500, unit: "g" },
        { name: "beef", quantity: 400, unit: "g" },
      ],
      steps: ["Knead", "Fill", "Boil"],
    },
    side: {
      id: "bread",
      name: "Shotis puri",
      description: "Bread side dish fixture description for schema length.",
      category: "side",
      servings: 4,
      prepMinutes: 15,
      cookMinutes: 20,
      difficulty: "easy",
      dietaryLabels: ["vegan"],
      ingredients: [
        { name: "flour", quantity: 400, unit: "g" },
        { name: "water", quantity: 250, unit: "ml" },
      ],
      steps: ["Mix", "Bake", "Serve"],
    },
    dessert: {
      id: "churchkhela",
      name: "Churchkhela",
      description: "Candle-shaped candy fixture for dessert slot tests.",
      category: "dessert",
      servings: 4,
      prepMinutes: 30,
      cookMinutes: 40,
      difficulty: "medium",
      dietaryLabels: ["vegetarian"],
      ingredients: [
        { name: "grape juice", quantity: 1, unit: "l" },
        { name: "nuts", quantity: 200, unit: "g" },
      ],
      steps: ["Simmer", "Dip", "Dry"],
    },
    drink: {
      name: "Tarragon lemonade",
      type: "soft-drink",
      alcoholic: false,
      description: "Bright green soda fixture drink description.",
    },
  },
};

describe("cuisineFlagsFor", () => {
  beforeEach(() => {
    setRuntimeCountries([]);
  });

  it("maps known cuisine codes to flags from the catalog", () => {
    const flags = cuisineFlagsFor(["it", "ge", "zz"]);
    expect(flags.map((f) => f.code)).toEqual(["it", "ge"]);
    expect(flags[0]?.flag).toBeTruthy();
  });
});

describe("matchMenuItemNationalDishes", () => {
  beforeEach(() => {
    setRuntimeCountries([geFixture]);
  });

  it("flags menu items that match national dishes", () => {
    const matches = matchMenuItemNationalDishes({ id: "khinkali", name: "Khinkali" }, [
      "ge",
    ]);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.code).toBe("ge");
    expect(matches[0]?.isNationalDish).toBe(true);
  });

  it("returns empty when no cuisine codes", () => {
    expect(matchMenuItemNationalDishes({ id: "x", name: "Khinkali" }, [])).toEqual([]);
  });

  it("prefers AI-assigned cuisine codes on the menu item", () => {
    setRuntimeCountries([
      geFixture,
      {
        ...geFixture,
        code: "et",
        slug: "ethiopia",
        name: "Ethiopia",
        flag: "🇪🇹",
        nationalDishId: "injera",
        menu: undefined,
        cookReady: false,
        standaloneRecipes: [
          {
            id: "injera",
            name: "Injera",
            description: "Sourdough flatbread fixture used for cuisine code tests.",
            category: "main",
            servings: 4,
            prepMinutes: 20,
            cookMinutes: 10,
            difficulty: "easy",
            dietaryLabels: ["vegan"],
            ingredients: [
              { name: "teff", quantity: 200, unit: "g" },
              { name: "water", quantity: 300, unit: "ml" },
            ],
            steps: ["Mix", "Ferment", "Cook"],
          },
        ],
      },
    ]);
    const matches = matchMenuItemNationalDishes(
      {
        id: "injera",
        name: "House salad",
        cuisineCodes: ["et"],
      },
      ["ge"],
    );
    expect(matches.map((m) => m.code)).toEqual(["et"]);
  });
});

describe("formatPriceLevel", () => {
  it("renders euro symbols", () => {
    expect(formatPriceLevel(1)).toBe("€");
    expect(formatPriceLevel(3)).toBe("€€€");
    expect(formatPriceLevel(undefined)).toBeNull();
  });
});

describe("stableMapsUrl", () => {
  it("replaces dead goo.gl short links with a search URL", async () => {
    const { stableMapsUrl, isUnstableMapsShortUrl } = await import("@/restaurants/utils");
    expect(isUnstableMapsShortUrl("https://goo.gl/maps/7gR6H1q7G8y")).toBe(true);
    const url = stableMapsUrl("https://goo.gl/maps/7gR6H1q7G8y", {
      name: "Restaurante O Pescador",
      address: "Lange Leidsedwarsstraat 78",
      city: "Amsterdam",
    });
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain(encodeURIComponent("Restaurante O Pescador"));
  });
});
