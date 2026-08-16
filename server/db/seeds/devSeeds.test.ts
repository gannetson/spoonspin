import { describe, expect, it, afterEach } from "vitest";
import { shouldRunDevSeeds } from "./devSeeds";

describe("shouldRunDevSeeds", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("is disabled in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.SPOONSPIN_DISABLE_DEV_SEEDS;
    expect(shouldRunDevSeeds()).toBe(false);
  });

  it("runs in development and test", () => {
    process.env.NODE_ENV = "development";
    expect(shouldRunDevSeeds()).toBe(true);
    process.env.NODE_ENV = "test";
    expect(shouldRunDevSeeds()).toBe(true);
  });

  it("can be disabled explicitly", () => {
    process.env.NODE_ENV = "development";
    process.env.SPOONSPIN_DISABLE_DEV_SEEDS = "1";
    expect(shouldRunDevSeeds()).toBe(false);
  });
});
