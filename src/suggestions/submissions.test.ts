import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, ensureDb, resetAllTables } from "../../server/db/restaurants.ts";
import {
  insertDrinkSubmission,
  insertRecipeSubmission,
  insertShopSubmission,
  listVisibleDrinksForCountry,
  listVisibleRecipesForCountry,
  listVisibleShopsForCountry,
  setDrinkSubmissionStatus,
  setRecipeSubmissionStatus,
  setShopSubmissionStatus,
  slugifyId,
} from "../../server/db/submissions.ts";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() || "postgresql://localhost:5432/spoonspin_test";

describe("suggestion submissions", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await closeDb();
    await ensureDb();
    await resetAllTables();
  });

  afterEach(async () => {
    await closeDb();
    delete process.env.DATABASE_URL;
  });

  it("slugifies stable unique ids", () => {
    const a = slugifyId("suggest", "Banitsa!");
    const b = slugifyId("suggest", "Banitsa!");
    expect(a).toMatch(/^suggest-banitsa-/);
    expect(a).not.toEqual(b);
  });

  it("lists pending recipes and hides rejected ones", async () => {
    const recipe = {
      id: "suggest-test-1",
      name: "Test Dish",
      description: "A tasty test dish used only for unit tests of community suggestions.",
      category: "main" as const,
      servings: 2,
      prepMinutes: 10,
      cookMinutes: 20,
      difficulty: "easy" as const,
      dietaryLabels: [],
      ingredients: [
        { name: "flour", quantity: 100, unit: "g" },
        { name: "water", quantity: 50, unit: "ml" },
      ],
      steps: [
        "Mix the flour and water until a dough forms.",
        "Rest the dough for a few minutes on the counter.",
        "Cook gently until done and serve warm.",
      ],
    };

    await insertRecipeSubmission({
      id: recipe.id,
      countryCode: "bg",
      countryName: "Bulgaria",
      query: "test dish",
      recipe,
    });

    expect((await listVisibleRecipesForCountry("bg")).map((r) => r.id)).toContain(
      recipe.id,
    );

    await setRecipeSubmissionStatus(recipe.id, "rejected");
    expect((await listVisibleRecipesForCountry("bg")).map((r) => r.id)).not.toContain(
      recipe.id,
    );
  });

  it("lists pending drinks and hides rejected ones", async () => {
    const drink = {
      id: "suggest-drink-test-1",
      name: "Test Rakia",
      type: "spirit" as const,
      alcoholic: true,
      description:
        "A strong fruit brandy used only for unit tests of community drink suggestions.",
    };

    await insertDrinkSubmission({
      id: drink.id,
      countryCode: "bg",
      countryName: "Bulgaria",
      query: "rakia",
      drink,
    });

    expect((await listVisibleDrinksForCountry("bg")).map((d) => d.id)).toContain(
      drink.id,
    );

    await setDrinkSubmissionStatus(drink.id, "rejected");
    expect((await listVisibleDrinksForCountry("bg")).map((d) => d.id)).not.toContain(
      drink.id,
    );
  });

  it("lists pending shops and hides rejected ones", async () => {
    const shop = {
      id: "suggest-shop-test-1",
      name: "Test Toko",
      city: "Amsterdam",
      address: "Teststraat 1",
      specialty: "Southeast Asian pantry staples for home cooks.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Test+Toko",
    };

    await insertShopSubmission({
      id: shop.id,
      countryCode: "id",
      countryName: "Indonesia",
      query: "toko",
      shop,
    });

    expect((await listVisibleShopsForCountry("id")).map((s) => s.id)).toContain(shop.id);

    await setShopSubmissionStatus(shop.id, "rejected");
    expect((await listVisibleShopsForCountry("id")).map((s) => s.id)).not.toContain(
      shop.id,
    );
  });
});
