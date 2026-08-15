#!/usr/bin/env tsx
/**
 * Complete incomplete countries to cook-ready menus:
 * starter + main + side + dessert + menu drink, cook_ready = true.
 *
 *   npm run agent:complete-menus
 *   npm run agent:complete-menus -- --batch 5
 *   npm run agent:complete-menus -- --code ao
 *   npm run agent:complete-menus -- --force
 *   npm run agent:complete-menus -- --status
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  listCountriesFromDb,
  replaceCountryRecipes,
  upsertCountryRecord,
  type MenuSlot,
} from "../server/db/content.ts";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import {
  discoverCountryDrinks,
  discoverCountryRecipes,
  expandDishCandidates,
  isOpenAiConfigured,
  type DishCandidate,
} from "../server/openai/adminDiscover.ts";
import { chatJson } from "../server/openai/suggest.ts";
import {
  getCountryDrinks,
  getCountryRecipes,
} from "../src/content/countries/menuAccessors.ts";
import type { Country, Recipe, RecipeCategory } from "../src/types/content.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISHES_PATH = path.join(rootDir, "data/dishes-by-country.json");
const PROGRESS_PATH = path.join(rootDir, "data/complete-menus-progress.json");

const CORE_SLOTS: Array<"starter" | "main" | "side" | "dessert"> = [
  "starter",
  "main",
  "side",
  "dessert",
];

type WikiDish = {
  name: string;
  wikipediaTitle?: string;
  wikipediaUrl?: string;
  summary?: string;
  imageUrl?: string;
  imageAttribution?: string;
  sourceUrl?: string;
  videoUrl?: string;
};

type WikiCountryDishes = {
  code: string;
  name: string;
  dishes: WikiDish[];
};

type Progress = {
  completedCodes: string[];
  failedCodes: string[];
  lifetimeCompleted: number;
  runs: number;
  lastRunAt: string | null;
};

function parseArgs(argv: string[]) {
  const status = argv.includes("--status");
  const force = argv.includes("--force");
  const codeIdx = argv.indexOf("--code");
  const code = codeIdx >= 0 ? argv[codeIdx + 1]?.toLowerCase() : undefined;
  const batchIdx = argv.indexOf("--batch");
  const batch = batchIdx >= 0 ? Math.max(1, Number(argv[batchIdx + 1] || 5)) : 5;
  return { status, force, code, batch };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`  ${label} attempt ${i}/${attempts} failed`);
      await sleep(800 * i);
    }
  }
  throw lastError;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function loadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function saveJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function loadProgress(): Progress {
  const raw = loadJson<Partial<Progress>>(PROGRESS_PATH, {});
  return {
    completedCodes: raw.completedCodes ?? [],
    failedCodes: raw.failedCodes ?? [],
    lifetimeCompleted: raw.lifetimeCompleted ?? 0,
    runs: raw.runs ?? 0,
    lastRunAt: raw.lastRunAt ?? null,
  };
}

function isFullRecipe(recipe: Recipe): boolean {
  return (
    recipe.ingredients.length >= 2 &&
    recipe.steps.length >= 3 &&
    !recipe.ingredients.some((item) =>
      /details loading|see enrichment/i.test(item.name),
    ) &&
    !recipe.steps.some((step) => /being generated in the background/i.test(step))
  );
}

function guessCategory(name: string, summary?: string): RecipeCategory {
  const text = `${name} ${summary ?? ""}`.toLowerCase();
  if (
    /\b(cake|cookie|pudding|dessert|sweet|ice cream|pastry|baklava|halva|flan|tart|pie|candy|chocolate|pudding|mousse|cheesecake|knafeh|maamoul)\b/.test(
      text,
    )
  ) {
    return "dessert";
  }
  if (
    /\b(salad|pickle|relish|chutney|salsa|dip|bread|rice|fries|chips|slaw|coleslaw|cabbage|beans|lentils|side|sauce|sambal|ajvar)\b/.test(
      text,
    )
  ) {
    return "side";
  }
  if (
    /\b(soup|stew|starter|appetizer|mezze|meze|dumpling|samosa|spring roll|empanada|patty|fritter|kebab|skewer)\b/.test(
      text,
    )
  ) {
    return "starter";
  }
  return "main";
}

function isUsableDishName(name: string): boolean {
  const n = name.trim();
  if (n.length < 2 || n.length > 60) return false;
  if (/\bas food\b/i.test(n)) return false;
  if (/^list of\b/i.test(n)) return false;
  if (/\bcategory:/i.test(n)) return false;
  if (/\b(cuisine|culture|history)\b/i.test(n) && !/\b(pie|cake|soup|stew)\b/i.test(n)) {
    return false;
  }
  // Generic Wikipedia food pages, not dishes.
  if (
    /^(lamb and mutton|beef|pork|chicken|rice|bread|cheese|fish|meat|vegetable|fruit|egg|potato|tomato)s?$/i.test(
      n,
    )
  ) {
    return false;
  }
  if (/\band\b.+\b(as|or)\b/i.test(n)) return false;
  return true;
}

function wikiToCandidates(countryCode: string, dishes: WikiDish[]): DishCandidate[] {
  const seen = new Set<string>();
  const out: DishCandidate[] = [];
  for (const dish of dishes) {
    if (!isUsableDishName(dish.name)) continue;
    const base = slugify(dish.name) || "dish";
    const id = `${countryCode}:${base}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const summary = dish.summary?.trim() || "";
    const description =
      summary.length >= 40
        ? summary.slice(0, 400)
        : `${dish.name} is a traditional dish associated with this cuisine.`;
    out.push({
      id,
      name: dish.name,
      description,
      category: guessCategory(dish.name, summary),
    });
  }
  return out;
}

function recipeToCandidate(recipe: Recipe): DishCandidate {
  return {
    id: recipe.id,
    name: recipe.name,
    localName: recipe.localName,
    description: recipe.description,
    category: recipe.category === "snack" ? "starter" : recipe.category,
  };
}

function ensureUniqueIds(recipes: Recipe[], countryCode: string): Recipe[] {
  const seen = new Set<string>();
  return recipes.map((recipe, index) => {
    let id = recipe.id?.trim() || slugify(recipe.name) || `dish-${index + 1}`;
    if (!id.includes(":")) id = `${countryCode}:${id}`;
    let unique = id;
    let n = 2;
    while (seen.has(unique)) {
      unique = `${id}-${n}`;
      n += 1;
    }
    seen.add(unique);
    return { ...recipe, id: unique };
  });
}

function heuristicSlots(recipes: Recipe[]): {
  starter?: Recipe;
  main?: Recipe;
  side?: Recipe;
  dessert?: Recipe;
} {
  const used = new Set<string>();
  const take = (category: RecipeCategory, fallbacks: RecipeCategory[] = []) => {
    for (const cat of [category, ...fallbacks]) {
      const hit = recipes.find(
        (recipe) => recipe.category === cat && !used.has(recipe.id),
      );
      if (hit) {
        used.add(hit.id);
        return hit;
      }
    }
    const any = recipes.find((recipe) => !used.has(recipe.id));
    if (any) {
      used.add(any.id);
      return { ...any, category };
    }
    return undefined;
  };

  return {
    starter: take("starter", ["snack", "side"]),
    main: take("main", ["starter"]),
    side: take("side", ["snack", "starter"]),
    dessert: take("dessert", ["snack"]),
  };
}

async function assignSlotsWithLlm(input: {
  countryName: string;
  countryCode: string;
  candidates: DishCandidate[];
}): Promise<Record<"starter" | "main" | "side" | "dessert", string>> {
  const raw = await chatJson(
    `You are a cuisine editor for Spoon Spin. Reply with JSON only.
Pick four distinct dishes for a classic home dinner: starter, main, side, dessert.`,
    `Country: ${input.countryName} (${input.countryCode})
Candidates:
${JSON.stringify(
  input.candidates.map((dish) => ({
    id: dish.id,
    name: dish.name,
    category: dish.category,
    description: dish.description.slice(0, 120),
  })),
  null,
  2,
)}

Return JSON:
{
  "starter": "<candidate id>",
  "main": "<candidate id>",
  "side": "<candidate id>",
  "dessert": "<candidate id>"
}

Use only ids from the list. All four must be different.`,
  );

  const parsed = z
    .object({
      starter: z.string().min(1),
      main: z.string().min(1),
      side: z.string().min(1),
      dessert: z.string().min(1),
    })
    .parse(raw);

  const ids = new Set(input.candidates.map((dish) => dish.id));
  for (const slot of CORE_SLOTS) {
    if (!ids.has(parsed[slot])) {
      throw new Error(`LLM picked unknown ${slot} id: ${parsed[slot]}`);
    }
  }
  const values = CORE_SLOTS.map((slot) => parsed[slot]);
  if (new Set(values).size !== 4) {
    throw new Error("LLM returned duplicate slot dishes");
  }
  return parsed;
}

function buildIntroduction(country: Country): string {
  const intro = country.introduction?.trim() || "";
  if (intro.length >= 60) return intro;
  const wiki = country.wikipedia?.summary?.trim() || "";
  if (wiki.length >= 60) return wiki.slice(0, 500);
  return `${country.name} offers a distinctive cuisine shaped by local ingredients and home cooking traditions. This cook menu highlights approachable dishes for a Dutch kitchen.`;
}

function ensureAliases(country: Country): string[] {
  if (country.cuisineAliases?.length) return country.cuisineAliases;
  const aliases = [country.name.toLowerCase()];
  if (country.slug && country.slug !== country.name.toLowerCase()) {
    aliases.push(country.slug.replace(/-/g, " "));
  }
  return [...new Set(aliases)];
}

async function completeCountry(
  country: Country,
  dishesByCountry: Record<string, WikiCountryDishes>,
): Promise<{ recipeCount: number; drinkCount: number }> {
  const existingRecipes = getCountryRecipes(country).filter(isFullRecipe);
  const existingDrinks = getCountryDrinks(country);
  const existingNames = existingRecipes.map((recipe) => recipe.name);

  // OpenAI discover first (reliable dish names + categories), then wiki extras.
  const discovered = await withRetry(`discover recipes ${country.code}`, () =>
    discoverCountryRecipes({
      countryCode: country.code,
      countryName: country.name,
      existingNames,
    }),
  );
  let candidates: DishCandidate[] = discovered.recipes.map((dish) => ({
    ...dish,
    id: `${country.code}:${slugify(dish.name) || dish.id}`,
  }));

  for (const recipe of existingRecipes) {
    if (
      !candidates.some((item) => item.name.toLowerCase() === recipe.name.toLowerCase())
    ) {
      candidates.unshift(recipeToCandidate(recipe));
    }
  }

  const wikiEntry = dishesByCountry[country.code];
  for (const dish of wikiToCandidates(country.code, wikiEntry?.dishes ?? [])) {
    if (candidates.some((item) => item.name.toLowerCase() === dish.name.toLowerCase())) {
      continue;
    }
    candidates.push(dish);
  }

  if (candidates.length < 4) {
    throw new Error(`Not enough dish candidates (${candidates.length})`);
  }

  // Cap expansion budget: core 4 + up to 4 more.
  let slotIds: Record<"starter" | "main" | "side" | "dessert", string>;
  try {
    slotIds = await assignSlotsWithLlm({
      countryCode: country.code,
      countryName: country.name,
      candidates: candidates.slice(0, 20),
    });
  } catch {
    // Heuristic fallback from candidate categories.
    const byCat = (category: RecipeCategory) =>
      candidates.find((dish) => dish.category === category);
    const used = new Set<string>();
    const take = (category: RecipeCategory) => {
      const hit =
        byCat(category) ||
        candidates.find((dish) => !used.has(dish.id)) ||
        candidates[0]!;
      used.add(hit.id);
      return hit.id;
    };
    slotIds = {
      starter: take("starter"),
      main: take("main"),
      side: take("side"),
      dessert: take("dessert"),
    };
  }

  const chosenIds = new Set(Object.values(slotIds));
  const moreCandidates = candidates.filter((dish) => !chosenIds.has(dish.id)).slice(0, 2);
  const expandList: DishCandidate[] = [
    ...CORE_SLOTS.map((slot) => {
      const dish = candidates.find((item) => item.id === slotIds[slot])!;
      return { ...dish, category: slot };
    }),
    ...moreCandidates,
  ];

  // Reuse existing full recipes when names match; expand the rest.
  const existingByName = new Map(
    existingRecipes.map((recipe) => [recipe.name.toLowerCase(), recipe]),
  );
  const toExpand: DishCandidate[] = [];
  const reused: Recipe[] = [];
  for (const dish of expandList) {
    const hit = existingByName.get(dish.name.toLowerCase());
    if (hit && isFullRecipe(hit)) {
      reused.push({
        ...hit,
        id: dish.id,
        category: dish.category,
      });
    } else {
      toExpand.push(dish);
    }
  }

  // Expand one-by-one for reliability (model often renames/omits in batches).
  const expandedById = new Map<string, Recipe>();
  for (const dish of toExpand) {
    try {
      const [made] = await expandDishCandidates({
        countryCode: country.code,
        countryName: country.name,
        dishes: [dish],
      });
      if (made) {
        expandedById.set(dish.id, {
          ...made,
          id: dish.id,
          category: dish.category,
          name: made.name?.trim() ? made.name : dish.name,
        });
      }
    } catch (error) {
      console.warn(`  expand failed for ${dish.name}`, error);
    }
    await sleep(200);
  }

  const resolved: Recipe[] = [];
  for (const dish of expandList) {
    const reuse = reused.find(
      (recipe) => recipe.name.toLowerCase() === dish.name.toLowerCase(),
    );
    if (reuse) {
      resolved.push({
        ...reuse,
        id: dish.id,
        category: dish.category,
      });
      continue;
    }
    const made = expandedById.get(dish.id);
    if (!made) {
      // Optional "more" dishes may fail; core slots must succeed.
      if (CORE_SLOTS.includes(dish.category as (typeof CORE_SLOTS)[number])) {
        throw new Error(`Missing expanded recipe for ${dish.name}`);
      }
      continue;
    }
    resolved.push(made);
  }

  for (const slot of CORE_SLOTS) {
    if (
      !resolved.some((recipe) => recipe.category === slot || recipe.id === slotIds[slot])
    ) {
      // Ensure each core slot id is present after optional more drops.
      const needed = expandList.find((dish) => dish.id === slotIds[slot]);
      if (needed && !resolved.some((recipe) => recipe.id === needed.id)) {
        throw new Error(`Missing core ${slot} recipe (${needed.name})`);
      }
    }
  }

  const uniqueRecipes = ensureUniqueIds(resolved, country.code);
  const byId = new Map(uniqueRecipes.map((recipe) => [recipe.id, recipe]));

  // Resolve core slots after id uniquify (ids may have changed only on collision).
  const findSlotRecipe = (slot: (typeof CORE_SLOTS)[number]): Recipe => {
    const wantedId = slotIds[slot];
    const direct = byId.get(wantedId);
    if (direct) return { ...direct, category: slot };
    const byName = uniqueRecipes.find(
      (recipe) =>
        recipe.name.toLowerCase() ===
        (candidates.find((dish) => dish.id === wantedId)?.name.toLowerCase() ?? ""),
    );
    if (byName) return { ...byName, category: slot };
    const heuristic = heuristicSlots(uniqueRecipes)[slot];
    if (heuristic) return { ...heuristic, category: slot };
    throw new Error(`Could not resolve ${slot} for ${country.code}`);
  };

  const starter = findSlotRecipe("starter");
  const main = findSlotRecipe("main");
  const side = findSlotRecipe("side");
  const dessert = findSlotRecipe("dessert");
  const coreIds = new Set([starter.id, main.id, side.id, dessert.id]);
  const moreRecipes = uniqueRecipes.filter((recipe) => !coreIds.has(recipe.id));

  let drinks = existingDrinks;
  if (drinks.length === 0) {
    const found = await withRetry(`discover drinks ${country.code}`, () =>
      discoverCountryDrinks({
        countryCode: country.code,
        countryName: country.name,
        existingNames: [],
      }),
    );
    drinks = found.drinks;
  }
  if (drinks.length === 0) {
    // Last-resort placeholder so cook-ready can still assemble.
    drinks = [
      {
        name: `${country.name} tea`,
        type: "tea",
        alcoholic: false,
        description: `A traditional tea or herbal infusion commonly enjoyed with meals in ${country.name}.`,
      },
    ];
  }

  const menuDrink = drinks[0]!;
  const moreDrinks = drinks.slice(1, 12);
  const nationalDrink = country.nationalDrink ?? menuDrink;

  const menuCountry: Country = {
    ...country,
    introduction: buildIntroduction(country),
    cuisineAliases: ensureAliases(country),
    nationalDishId: main.id,
    nationalDrink,
    cookReady: true,
    status: country.status === "draft" ? "published" : country.status,
    standaloneRecipes: undefined,
    moreDrinks: undefined,
    menu: {
      starter,
      main,
      side,
      dessert,
      drink: menuDrink,
      moreRecipes: moreRecipes.length > 0 ? moreRecipes : undefined,
      moreDrinks: moreDrinks.length > 0 ? moreDrinks : undefined,
    },
  };

  await upsertCountryRecord(menuCountry);
  await replaceCountryRecipes(country.code, [
    { recipe: starter, menuSlot: "starter" as MenuSlot, sortOrder: 0 },
    { recipe: main, menuSlot: "main", sortOrder: 0 },
    { recipe: side, menuSlot: "side", sortOrder: 0 },
    { recipe: dessert, menuSlot: "dessert", sortOrder: 0 },
    ...moreRecipes.map((recipe, index) => ({
      recipe,
      menuSlot: "more" as MenuSlot,
      sortOrder: index,
    })),
  ]);

  return {
    recipeCount: 4 + moreRecipes.length,
    drinkCount: 1 + moreDrinks.length,
  };
}

function isIncomplete(country: Country): boolean {
  return !country.cookReady;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!isOpenAiConfigured() && !args.status) {
    console.error("OPENAI_API_KEY is required for agent:complete-menus");
    process.exit(1);
  }

  await getDb();
  const countries = await listCountriesFromDb();
  const dishesByCountry = loadJson<Record<string, WikiCountryDishes>>(DISHES_PATH, {});
  const progress = loadProgress();

  const pending = countries.filter((country) => {
    if (args.code && country.code !== args.code) return false;
    if (args.force) return true;
    return isIncomplete(country);
  });

  if (args.status) {
    const ready = countries.filter((country) => country.cookReady).length;
    console.log(
      `Cook menus: ${ready} ready · ${pending.length} pending · ${countries.length} countries`,
    );
    console.log(`Dish research file: ${fs.existsSync(DISHES_PATH) ? "yes" : "MISSING"}`);
    console.log(`Lifetime completed: ${progress.lifetimeCompleted}`);
    console.log("Next:");
    for (const country of pending.slice(0, 15)) {
      console.log(
        `  - ${country.code} ${country.name} (recipes=${getCountryRecipes(country).length} drinks=${getCountryDrinks(country).length})`,
      );
    }
    await closeDb();
    return;
  }

  if (!fs.existsSync(DISHES_PATH)) {
    console.warn(
      `Warning: ${DISHES_PATH} missing — will rely on OpenAI discover for dish names.`,
    );
  }

  const batch = pending.slice(0, args.code ? pending.length : args.batch);
  console.log(
    `Complete-menus batch: ${batch.length} · ${Math.max(0, pending.length - batch.length)} remaining after`,
  );

  let completed = 0;
  for (const country of batch) {
    process.stdout.write(`${country.code} ${country.name}… `);
    try {
      const result = await completeCountry(country, dishesByCountry);
      if (!progress.completedCodes.includes(country.code)) {
        progress.completedCodes.push(country.code);
      }
      progress.failedCodes = progress.failedCodes.filter((code) => code !== country.code);
      completed += 1;
      console.log(`✓ ${result.recipeCount} recipes · ${result.drinkCount} drinks`);
    } catch (error) {
      console.log("failed");
      console.warn(error);
      if (!progress.failedCodes.includes(country.code)) {
        progress.failedCodes.push(country.code);
      }
    }
    progress.lastRunAt = new Date().toISOString();
    saveJson(PROGRESS_PATH, progress);
    await sleep(500);
  }

  progress.lifetimeCompleted += completed;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveJson(PROGRESS_PATH, progress);

  await closeDb();
  console.log(`\nCompleted ${completed} country menu(s).`);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
