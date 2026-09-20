import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Restaurant } from "@/restaurants/types";

const calls: string[] = [];
const replaceRestaurantImage = vi.fn();
const replaceRestaurantText = vi.fn();
const findRestaurantScores = vi.fn();

vi.mock("@/admin/countryTools", () => ({
  replaceRestaurantImage: (...args: unknown[]) => replaceRestaurantImage(...args),
  replaceRestaurantText: (...args: unknown[]) => replaceRestaurantText(...args),
  findRestaurantScores: (...args: unknown[]) => findRestaurantScores(...args),
  findRestaurantMenu: vi.fn(),
  removeRestaurant: vi.fn(),
  removeRecipe: vi.fn(),
  removeDrink: vi.fn(),
  removeShop: vi.fn(),
  removeOrderOption: vi.fn(),
  replaceRecipeImage: vi.fn(),
  replaceRecipeText: vi.fn(),
  replaceDrinkImage: vi.fn(),
  replaceDrinkText: vi.fn(),
  replaceShopText: vi.fn(),
  replaceOrderOptionImage: vi.fn(),
  replaceOrderOptionText: vi.fn(),
  replaceCountryImage: vi.fn(),
  selectForDinner: vi.fn(),
}));

const { handleRestaurantAdminAction } = await import("@/admin/itemActions");

const base: Restaurant = {
  id: "r1",
  name: "Sofra",
  address: "Kerkstraat 1",
  city: "Utrecht",
  cuisineCodes: ["tr"],
  mapsUrl: "https://maps.example/sofra",
};

function stepResult(marker: string) {
  return { restaurant: { ...base, name: `Sofra ${marker}` } };
}

function runReplaceAll(onUpdated = vi.fn()) {
  return {
    onUpdated,
    promise: handleRestaurantAdminAction({
      action: "replace-all",
      countryName: "Turkey",
      countryCode: "tr",
      restaurant: base,
      onUpdated,
      onRemoved: vi.fn(),
    }),
  };
}

beforeEach(() => {
  calls.length = 0;
  for (const fn of [
    replaceRestaurantImage,
    replaceRestaurantText,
    findRestaurantScores,
  ]) {
    fn.mockReset();
  }
  replaceRestaurantImage.mockImplementation(async () => {
    calls.push("image");
    return stepResult("image");
  });
  replaceRestaurantText.mockImplementation(async () => {
    calls.push("text");
    return stepResult("text");
  });
  findRestaurantScores.mockImplementation(async () => {
    calls.push("scores");
    return stepResult("scores");
  });
});

describe("restaurant 'replace all'", () => {
  it("runs image, text and scores", async () => {
    const { promise } = runReplaceAll();
    await expect(promise).resolves.toMatch(/image, text and scores/i);
    expect(calls).toEqual(["image", "text", "scores"]);
  });

  it("runs them one after another, not together", async () => {
    // Each call returns a whole restaurant, so overlapping them would let the
    // slowest response overwrite the other two.
    let imageSettled = false;
    replaceRestaurantImage.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      imageSettled = true;
      calls.push("image");
      return stepResult("image");
    });
    replaceRestaurantText.mockImplementation(async () => {
      expect(imageSettled).toBe(true);
      calls.push("text");
      return stepResult("text");
    });

    await runReplaceAll().promise;
    expect(calls).toEqual(["image", "text", "scores"]);
  });

  it("passes the country through to every step", async () => {
    await runReplaceAll().promise;
    expect(replaceRestaurantImage).toHaveBeenCalledWith("r1", "Turkey");
    expect(replaceRestaurantText).toHaveBeenCalledWith("r1", "Turkey", "tr");
    expect(findRestaurantScores).toHaveBeenCalledWith("r1", "Turkey");
  });

  it("applies each step's result as it arrives", async () => {
    const onUpdated = vi.fn();
    await runReplaceAll(onUpdated).promise;
    expect(onUpdated).toHaveBeenCalledTimes(3);
    expect(onUpdated.mock.calls.at(-1)?.[0]).toMatchObject({ name: "Sofra scores" });
  });

  it("keeps going when one step fails, and says which", async () => {
    // Losing the scores is no reason to skip the photo.
    replaceRestaurantText.mockRejectedValue(new Error("no text source"));
    const { promise } = runReplaceAll();
    await expect(promise).resolves.toBe("Updated image, scores · text failed");
    expect(calls).toEqual(["image", "scores"]);
  });

  it("reports an error only when every step fails", async () => {
    replaceRestaurantImage.mockRejectedValue(new Error("no image"));
    replaceRestaurantText.mockRejectedValue(new Error("no text"));
    findRestaurantScores.mockRejectedValue(new Error("no scores"));
    await expect(runReplaceAll().promise).rejects.toThrow("no image");
  });
});
