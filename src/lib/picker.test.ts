import { describe, expect, it } from "vitest";
import { pickRandomCountry, MAX_RECENT } from "@/lib/picker";
import type { Country } from "@/types/content";

function stubCountry(code: string, status: "draft" | "published"): Country {
  return {
    code,
    slug: code,
    name: code.toUpperCase(),
    flag: "🏳️",
    region: "Test",
    introduction: "Test country stub used only by picker unit tests.",
    cuisineAliases: [`${code} cuisine`],
    cookReady: status === "published",
    status,
  };
}

describe("pickRandomCountry", () => {
  it("never selects draft or non-cook-ready countries", () => {
    const countries = [
      stubCountry("aa", "draft"),
      { ...stubCountry("bb", "published"), cookReady: true },
      { ...stubCountry("cc", "published"), cookReady: false },
    ];
    for (let i = 0; i < 30; i += 1) {
      const picked = pickRandomCountry(countries, [], () => i / 30);
      expect(picked.status).toBe("published");
      expect(picked.cookReady).toBe(true);
      expect(picked.code).toBe("bb");
    }
  });

  it("excludes recent countries when enough alternatives exist", () => {
    const countries = Array.from({ length: 8 }, (_, index) =>
      stubCountry(`c${index}`, "published"),
    );
    const recent = countries.slice(0, MAX_RECENT).map((c) => c.code);
    const picked = pickRandomCountry(countries, recent, () => 0);
    expect(recent).not.toContain(picked.code);
  });

  it("falls back to cook-ready pool when recent covers almost everything", () => {
    const countries = [stubCountry("x1", "published"), stubCountry("x2", "published")];
    const recent = ["x1", "x2", "x3", "x4", "x5"];
    const picked = pickRandomCountry(countries, recent, () => 0.9);
    expect(["x1", "x2"]).toContain(picked.code);
  });
});
