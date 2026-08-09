import { describe, expect, it } from "vitest";
import { resolveLevelProgress, CUISINE_LEVELS } from "./levels";

describe("resolveLevelProgress", () => {
  it("starts with no level at zero countries", () => {
    const progress = resolveLevelProgress(0);
    expect(progress.current).toBeNull();
    expect(progress.levelNumber).toBe(0);
    expect(progress.next?.id).toBe("firstBite");
    expect(progress.progressToNext).toBe(0);
  });

  it("unlocks First Bite at 1", () => {
    const progress = resolveLevelProgress(1);
    expect(progress.current?.id).toBe("firstBite");
    expect(progress.levelNumber).toBe(1);
    expect(progress.next?.id).toBe("curiousFork");
  });

  it("shows Savour Savvy as level 3 at 5 countries", () => {
    const progress = resolveLevelProgress(5);
    expect(progress.current?.id).toBe("savourSavvy");
    expect(progress.levelNumber).toBe(3);
    expect(progress.next?.id).toBe("appetiteAdventurer");
  });

  it("reaches King of Cuisines at 197", () => {
    const progress = resolveLevelProgress(197);
    expect(progress.current?.id).toBe("kingOfCuisines");
    expect(progress.levelNumber).toBe(CUISINE_LEVELS.length);
    expect(progress.next).toBeNull();
    expect(progress.progressToNext).toBe(1);
  });

  it("has ascending thresholds ending at 197", () => {
    expect(CUISINE_LEVELS[0]?.threshold).toBe(1);
    expect(CUISINE_LEVELS.at(-1)?.threshold).toBe(197);
    for (let i = 1; i < CUISINE_LEVELS.length; i++) {
      expect(CUISINE_LEVELS[i]!.threshold).toBeGreaterThan(
        CUISINE_LEVELS[i - 1]!.threshold,
      );
    }
  });
});
