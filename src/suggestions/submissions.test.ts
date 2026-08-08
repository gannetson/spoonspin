import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  ensureDb,
  resetAllTables,
} from "../../server/db/restaurants.ts";
import {
  insertRecipeSubmission,
  listVisibleRecipesForCountry,
  setRecipeSubmissionStatus,
  slugifyId,
} from "../../server/db/submissions.ts";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://localhost:5432/spoonspin_test";

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
      description:
        "A tasty test dish used only for unit tests of community suggestions.",
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

    expect(
      (await listVisibleRecipesForCountry("bg")).map((r) => r.id),
    ).toContain(recipe.id);

    await setRecipeSubmissionStatus(recipe.id, "rejected");
    expect(
      (await listVisibleRecipesForCountry("bg")).map((r) => r.id),
    ).not.toContain(recipe.id);
  });
});
