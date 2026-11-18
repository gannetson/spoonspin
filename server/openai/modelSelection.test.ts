import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getModel, supportsTemperature } from "./suggest.ts";

const VARS = [
  "OPENAI_MODEL",
  "OPENAI_MODEL_RESTAURANT_COMPLETION",
  "OPENAI_MODEL_RESTAURANT_VERIFY",
  "OPENAI_MODEL_RECIPE_COMPLETION",
  "OPENAI_MODEL_IMAGE_QUERY",
  "OPENAI_MODEL_CONTENT_COMPLETION",
  "OPENAI_MODEL_REVIEW_SEARCH",
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of VARS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getModel", () => {
  it("falls back to the built-in default", () => {
    expect(getModel()).toBe("gpt-4o-mini");
    expect(getModel("recipe-completion")).toBe("gpt-4o-mini");
    expect(getModel("restaurant-verify")).toBe("gpt-4o-mini");
    expect(getModel("image-query")).toBe("gpt-5.6-luna");
    expect(getModel("content-completion")).toBe("gpt-5.6-luna");
    expect(getModel("review-search")).toBe("gpt-4.1-mini");
    expect(getModel("restaurant-completion")).toBe("gpt-5.6-luna");
  });

  it("uses the global override for every task", () => {
    process.env.OPENAI_MODEL = "gpt-5-mini";
    expect(getModel()).toBe("gpt-5-mini");
    expect(getModel("restaurant-completion")).toBe("gpt-5-mini");
    expect(getModel("restaurant-verify")).toBe("gpt-5-mini");
  });

  it("lets one task run cheaper without moving the rest", () => {
    // The point of the whole thing: mechanical restaurant completion can drop
    // to a smaller model while the authenticity gate keeps its quality.
    process.env.OPENAI_MODEL = "gpt-5-mini";
    process.env.OPENAI_MODEL_RESTAURANT_COMPLETION = "gpt-5.6-luna";
    expect(getModel("restaurant-completion")).toBe("gpt-5.6-luna");
    expect(getModel("restaurant-verify")).toBe("gpt-5-mini");
    expect(getModel()).toBe("gpt-5-mini");
  });

  it("ignores a blank override rather than sending an empty model", () => {
    process.env.OPENAI_MODEL_RESTAURANT_COMPLETION = "   ";
    expect(getModel("restaurant-completion")).toBe("gpt-5.6-luna");
  });

  it("maps retired nano overrides to their replacement", () => {
    process.env.OPENAI_MODEL = "gpt-4.1-nano";
    process.env.OPENAI_MODEL_IMAGE_QUERY = "gpt-4.1-nano-2025-04-14";
    expect(getModel()).toBe("gpt-5.6-luna");
    expect(getModel("image-query")).toBe("gpt-5.6-luna");
  });
});

describe("supportsTemperature", () => {
  it("sends the low temperature to the gpt-4.x models that accept it", () => {
    for (const model of ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o"]) {
      expect(supportsTemperature(model)).toBe(true);
    }
  });

  it("leaves it out for gpt-5 and later and the o-series, which reject anything but the default", () => {
    for (const model of ["gpt-5-mini", "gpt-5.6-luna", "gpt-6-luna", "o3", "o4-mini"]) {
      expect(supportsTemperature(model)).toBe(false);
    }
  });
});
