/** Country-taste milestones (distinct countries with did cook/dine). */
export const CUISINE_LEVELS = [
  { threshold: 1, id: "firstBite", titleKey: "levels.firstBite" },
  { threshold: 3, id: "curiousFork", titleKey: "levels.curiousFork" },
  { threshold: 5, id: "savourSavvy", titleKey: "levels.savourSavvy" },
  { threshold: 10, id: "appetiteAdventurer", titleKey: "levels.appetiteAdventurer" },
  { threshold: 15, id: "menuMapper", titleKey: "levels.menuMapper" },
  { threshold: 25, id: "globeGrazer", titleKey: "levels.globeGrazer" },
  { threshold: 40, id: "passportPalate", titleKey: "levels.passportPalate" },
  { threshold: 60, id: "cuisineCollector", titleKey: "levels.cuisineCollector" },
  { threshold: 80, id: "worldTable", titleKey: "levels.worldTable" },
  { threshold: 100, id: "centuryFeast", titleKey: "levels.centuryFeast" },
  { threshold: 130, id: "continentalConqueror", titleKey: "levels.continentalConqueror" },
  { threshold: 160, id: "almostEverywhere", titleKey: "levels.almostEverywhere" },
  { threshold: 197, id: "kingOfCuisines", titleKey: "levels.kingOfCuisines" },
] as const;

export type CuisineLevelId = (typeof CUISINE_LEVELS)[number]["id"];

export const TOTAL_CUISINE_COUNTRIES = 197;

export type LevelProgress = {
  countriesTasted: number;
  totalCountries: number;
  /** 1-based index of current level, or 0 if none unlocked. */
  levelNumber: number;
  /** Current level (highest threshold reached), or null if zero countries. */
  current: (typeof CUISINE_LEVELS)[number] | null;
  /** Next level to unlock, or null if at the top. */
  next: (typeof CUISINE_LEVELS)[number] | null;
  /** 0–1 progress toward next level (1 if maxed). */
  progressToNext: number;
};

/** Comic cook badge art for a level (or the pre-level “hungry explorer”). */
export function levelArtSrc(levelId: CuisineLevelId | "none" | null | undefined): string {
  return `/levels/${levelId ?? "none"}.png`;
}

export function resolveLevelProgress(countriesTasted: number): LevelProgress {
  const count = Math.max(0, Math.floor(countriesTasted));
  let current: (typeof CUISINE_LEVELS)[number] | null = null;
  let currentIndex = -1;
  for (let i = 0; i < CUISINE_LEVELS.length; i += 1) {
    const level = CUISINE_LEVELS[i]!;
    if (count >= level.threshold) {
      current = level;
      currentIndex = i;
    } else break;
  }
  const next =
    currentIndex + 1 < CUISINE_LEVELS.length ? CUISINE_LEVELS[currentIndex + 1]! : null;

  let progressToNext = 1;
  if (next) {
    const floor = current?.threshold ?? 0;
    const span = next.threshold - floor;
    progressToNext = span <= 0 ? 1 : Math.min(1, (count - floor) / span);
  }

  return {
    countriesTasted: count,
    totalCountries: TOTAL_CUISINE_COUNTRIES,
    levelNumber: currentIndex + 1,
    current,
    next,
    progressToNext,
  };
}
