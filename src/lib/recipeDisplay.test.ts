import { describe, expect, it } from "vitest";
import { isMostlyLatinScript, recipeDisplayName } from "./recipeDisplay";

describe("recipeDisplayName", () => {
  it("uses a Latin local name as the title", () => {
    expect(
      recipeDisplayName({
        name: "Peppers with Cottage Cheese",
        localName: "Fërgesë",
      }),
    ).toEqual({
      title: "Fërgesë",
      subtitle: "Peppers with Cottage Cheese",
    });
  });

  it("keeps the transcribed English name when localName is a foreign alphabet", () => {
    expect(
      recipeDisplayName({
        name: "Mapo Tofu",
        localName: "麻婆豆腐",
      }),
    ).toEqual({
      title: "Mapo Tofu",
      subtitle: "麻婆豆腐",
    });
  });

  it("falls back to name when there is no localName", () => {
    expect(recipeDisplayName({ name: "Stamppot" })).toEqual({ title: "Stamppot" });
  });

  it("detects Latin including diacritics", () => {
    expect(isMostlyLatinScript("Fërgesë")).toBe(true);
    expect(isMostlyLatinScript(" Pierogi ruskie ")).toBe(true);
    expect(isMostlyLatinScript("Σπανακόπιτα")).toBe(false);
    expect(isMostlyLatinScript(" millə köftə ")).toBe(true);
  });
});
