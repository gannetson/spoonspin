import { z } from "zod";

export const drinkSchema = z.object({
  name: z.string().min(1),
  localName: z.string().min(1).optional(),
  type: z.enum([
    "beer",
    "wine",
    "spirit",
    "cocktail",
    "soft-drink",
    "tea",
    "coffee",
  ]),
  alcoholic: z.boolean(),
  description: z.string().min(20),
});

export const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  note: z.string().optional(),
});

export const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  localName: z.string().min(1).optional(),
  description: z.string().min(40),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
  servings: z.number().int().positive(),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  difficulty: z.enum(["easy", "medium", "challenging"]),
  dietaryLabels: z.array(z.string()),
  ingredients: z.array(ingredientSchema).min(2),
  steps: z.array(z.string().min(10)).min(3),
  substitutions: z.array(z.string()).optional(),
  servingSuggestion: z.string().optional(),
  drinkPairing: z.string().optional(),
});

export const specialtyShopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  specialty: z.string().min(3),
  website: z.string().url().optional(),
  mapsUrl: z.string().url(),
  notes: z.string().optional(),
});

export const menuSchema = z.object({
  starter: recipeSchema,
  main: recipeSchema,
  side: recipeSchema,
  dessert: recipeSchema,
  drink: drinkSchema,
  moreRecipes: z.array(recipeSchema).optional(),
  moreDrinks: z.array(drinkSchema).optional(),
});

export const countrySchema = z
  .object({
    code: z
      .string()
      .length(2)
      .regex(/^[a-z]{2}$/),
    slug: z.string().min(2),
    name: z.string().min(2),
    flag: z.string().min(1),
    region: z.string().min(2),
    introduction: z.string().min(60),
    cuisineAliases: z.array(z.string().min(2)).min(1),
    nationalDishId: z.string().min(1),
    nationalDrink: drinkSchema,
    menu: menuSchema,
    specialtyShops: z.array(specialtyShopSchema).optional(),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((country, ctx) => {
    const recipes = [
      country.menu.starter,
      country.menu.main,
      country.menu.side,
      country.menu.dessert,
      ...(country.menu.moreRecipes ?? []),
    ];
    const ids = recipes.map((r) => r.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Recipe ids must be unique within a country menu",
        path: ["menu"],
      });
    }
    if (!ids.includes(country.nationalDishId)) {
      ctx.addIssue({
        code: "custom",
        message: `nationalDishId "${country.nationalDishId}" must match a menu recipe`,
        path: ["nationalDishId"],
      });
    }
  });

export const countryCatalogEntrySchema = z.object({
  code: z
    .string()
    .length(2)
    .regex(/^[a-z]{2}$/),
  slug: z.string().min(2),
  name: z.string().min(2),
  flag: z.string().min(1),
  region: z.string().min(2),
  status: z.enum(["draft", "published"]),
});
