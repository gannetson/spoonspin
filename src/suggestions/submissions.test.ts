import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeDb, getDb } from "../../server/db/restaurants.ts";
import {
  insertRecipeSubmission,
  listVisibleRecipesForCountry,
  setRecipeSubmissionStatus,
  slugifyId,
} from "../../server/db/submissions.ts";

describe("suggestion submissions", () => {
  it("slugifies stable unique ids", () => {
    const a = slugifyId("suggest", "Banitsa!");
    const b = slugifyId("suggest", "Banitsa!");
    expect(a).toMatch(/^suggest-banitsa-/);
    expect(a).not.toEqual(b);
  });

  it("lists pending recipes and hides rejected ones", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spoonspin-sub-"));
    const dbPath = path.join(dir, "test.sqlite");
    process.env.RESTAURANTS_DB_PATH = dbPath;
    closeDb();
    getDb(dbPath);

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

    insertRecipeSubmission({
      id: recipe.id,
      countryCode: "bg",
      countryName: "Bulgaria",
      query: "test dish",
      recipe,
    });

    expect(listVisibleRecipesForCountry("bg").map((r) => r.id)).toContain(
      recipe.id,
    );

    setRecipeSubmissionStatus(recipe.id, "rejected");
    expect(listVisibleRecipesForCountry("bg").map((r) => r.id)).not.toContain(
      recipe.id,
    );

    closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.RESTAURANTS_DB_PATH;
  });
});
