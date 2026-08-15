import { describe, expect, it } from "vitest";
import { FILL_CITIES } from "./lib/fillCities.ts";

describe("content fill cities", () => {
  it("covers the five Randstad hubs", () => {
    expect([...FILL_CITIES].sort()).toEqual(
      ["Amsterdam", "Den Haag", "Leiden", "Rotterdam", "Utrecht"].sort(),
    );
  });
});
