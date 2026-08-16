import type { QueryResultRow } from "pg";
import type {
  Country,
  DinnerSuggestion,
  Drink,
  OrderOption,
  Recipe,
  SpecialtyShop,
  WikipediaCuisine,
} from "../../src/types/content.ts";
import {
  getCountryDrinks,
  getCountryRecipes,
  getDinnerSuggestion,
  getSpecialtyShops,
} from "../../src/content/countries/menuAccessors.ts";
import { countByCuisineCode, ensureDb } from "./restaurants.ts";
import { createRegionResolver, findOrCreateRegion } from "./regions.ts";

const RECIPE_SELECT = `
  recipes.*,
  regions.name AS region_name
`;

const RECIPE_FROM = `
  FROM recipes
  LEFT JOIN regions ON recipes.region_id = regions.id
`;

export type MenuSlot = "starter" | "main" | "side" | "dessert" | "more";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject<T>(value: unknown): T | undefined {
  if (value == null) return undefined;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function rowToRecipe(row: QueryResultRow): Recipe {
  return {
    id: String(row.id),
    name: String(row.name),
    localName: row.local_name == null ? undefined : String(row.local_name),
    description: String(row.description),
    category: String(row.category) as Recipe["category"],
    servings: Number(row.servings),
    prepMinutes: Number(row.prep_minutes),
    cookMinutes: Number(row.cook_minutes),
    waitTime:
      row.wait_time == null || !String(row.wait_time).trim()
        ? undefined
        : String(row.wait_time).trim(),
    difficulty: String(row.difficulty) as Recipe["difficulty"],
    dietaryLabels: asArray<string>(row.dietary_labels),
    ingredients: asArray(row.ingredients),
    steps: asArray<string>(row.steps),
    substitutions: (() => {
      const value = asArray<string>(row.substitutions);
      return value.length > 0 ? value : undefined;
    })(),
    servingSuggestion:
      row.serving_suggestion == null ? undefined : String(row.serving_suggestion),
    drinkPairing: row.drink_pairing == null ? undefined : String(row.drink_pairing),
    imageUrl: row.image_url == null ? undefined : String(row.image_url),
    imageAttribution:
      row.image_attribution == null ? undefined : String(row.image_attribution),
    sourceUrl: row.source_url == null ? undefined : String(row.source_url),
    videoUrl: row.video_url == null ? undefined : String(row.video_url),
    regionId: row.region_id == null ? undefined : String(row.region_id),
    regionName: row.region_name == null ? undefined : String(row.region_name),
  };
}

function assembleCountry(row: QueryResultRow, recipes: Array<QueryResultRow>): Country {
  const bySlot = new Map<MenuSlot, Recipe[]>();
  for (const recipeRow of recipes) {
    const slot = String(recipeRow.menu_slot) as MenuSlot;
    const list = bySlot.get(slot) ?? [];
    list.push(rowToRecipe(recipeRow));
    bySlot.set(slot, list);
  }

  const starter = bySlot.get("starter")?.[0];
  const main = bySlot.get("main")?.[0];
  const side = bySlot.get("side")?.[0];
  const dessert = bySlot.get("dessert")?.[0];
  const moreRecipes = bySlot.get("more") ?? [];
  const menuDrink = asObject<Drink>(row.menu_drink);
  const hasFullMenu = Boolean(starter && main && side && dessert && menuDrink);
  const cookReady = Boolean(row.cook_ready) && hasFullMenu;
  const standaloneRecipes = hasFullMenu
    ? []
    : [
        ...(bySlot.get("starter") ?? []),
        ...(bySlot.get("main") ?? []),
        ...(bySlot.get("side") ?? []),
        ...(bySlot.get("dessert") ?? []),
        ...moreRecipes,
      ];

  const moreDrinksList = asArray<Drink>(row.more_drinks);
  const dinner = asObject<DinnerSuggestion>(row.dinner_json);

  return {
    code: String(row.code),
    slug: String(row.slug),
    name: String(row.name),
    flag: String(row.flag),
    region: String(row.region),
    introduction: String(row.introduction),
    wikipedia: asObject<WikipediaCuisine>(row.wikipedia),
    cuisineAliases: asArray<string>(row.cuisine_aliases),
    nationalDishId:
      row.national_dish_id == null ? undefined : String(row.national_dish_id),
    nationalDrink: asObject<Drink>(row.national_drink),
    specialtyShops: asArray<SpecialtyShop>(row.specialty_shops),
    orderOptions: asArray<OrderOption>(row.order_options),
    imageUrl: row.image_url == null ? undefined : String(row.image_url),
    imageAttribution:
      row.image_attribution == null ? undefined : String(row.image_attribution),
    cookReady,
    status: String(row.status) as Country["status"],
    dinner,
    standaloneRecipes: standaloneRecipes.length > 0 ? standaloneRecipes : undefined,
    moreDrinks: !hasFullMenu && moreDrinksList.length > 0 ? moreDrinksList : undefined,
    menu: hasFullMenu
      ? {
          starter: starter!,
          main: main!,
          side: side!,
          dessert: dessert!,
          drink: menuDrink!,
          moreRecipes: moreRecipes.length > 0 ? moreRecipes : undefined,
          moreDrinks: moreDrinksList.length > 0 ? moreDrinksList : undefined,
        }
      : undefined,
  };
}

export async function listPublishedCountryCodes(): Promise<string[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT code FROM countries
     WHERE status = 'published'
     ORDER BY code ASC`,
  );
  return result.rows.map((row) => String(row.code).toLowerCase());
}

export async function listCountriesFromDb(): Promise<Country[]> {
  const db = await ensureDb();
  const countries = await db.query(`SELECT * FROM countries ORDER BY name ASC`);
  const recipes = await db.query(
    `SELECT ${RECIPE_SELECT} ${RECIPE_FROM} ORDER BY country_code, menu_slot, sort_order, id`,
  );
  const byCode = new Map<string, QueryResultRow[]>();
  for (const row of recipes.rows) {
    const code = String(row.country_code);
    const list = byCode.get(code) ?? [];
    list.push(row);
    byCode.set(code, list);
  }
  return countries.rows.map((row) =>
    assembleCountry(row, byCode.get(String(row.code)) ?? []),
  );
}

export async function getCountryFromDb(code: string): Promise<Country | undefined> {
  const db = await ensureDb();
  const country = await db.query(`SELECT * FROM countries WHERE code = $1`, [
    code.toLowerCase(),
  ]);
  const row = country.rows[0];
  if (!row) return undefined;
  const recipes = await db.query(
    `SELECT ${RECIPE_SELECT} ${RECIPE_FROM}
     WHERE country_code = $1
     ORDER BY menu_slot, sort_order, id`,
    [code.toLowerCase()],
  );
  return assembleCountry(row, recipes.rows);
}

export async function upsertCountryRecord(country: Country): Promise<void> {
  const db = await ensureDb();
  await db.query(
    `INSERT INTO countries (
      code, slug, name, flag, region, introduction, cuisine_aliases,
      national_dish_id, national_drink, menu_drink, more_drinks, wikipedia,
      specialty_shops, order_options, image_url, image_attribution, dinner_json,
      cook_ready, status, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7::jsonb,
      $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
      $13::jsonb, $14::jsonb, $15, $16, $17::jsonb,
      $18, $19, NOW()
    )
    ON CONFLICT (code) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      flag = EXCLUDED.flag,
      region = EXCLUDED.region,
      introduction = EXCLUDED.introduction,
      cuisine_aliases = EXCLUDED.cuisine_aliases,
      national_dish_id = EXCLUDED.national_dish_id,
      national_drink = EXCLUDED.national_drink,
      menu_drink = EXCLUDED.menu_drink,
      more_drinks = EXCLUDED.more_drinks,
      wikipedia = EXCLUDED.wikipedia,
      specialty_shops = EXCLUDED.specialty_shops,
      order_options = EXCLUDED.order_options,
      image_url = COALESCE(EXCLUDED.image_url, countries.image_url),
      image_attribution = COALESCE(EXCLUDED.image_attribution, countries.image_attribution),
      dinner_json = COALESCE(EXCLUDED.dinner_json, countries.dinner_json),
      cook_ready = EXCLUDED.cook_ready,
      status = EXCLUDED.status,
      updated_at = NOW()`,
    [
      country.code.toLowerCase(),
      country.slug,
      country.name,
      country.flag,
      country.region,
      country.introduction,
      JSON.stringify(country.cuisineAliases),
      country.nationalDishId ?? null,
      country.nationalDrink ? JSON.stringify(country.nationalDrink) : null,
      country.menu?.drink ? JSON.stringify(country.menu.drink) : null,
      JSON.stringify(country.menu?.moreDrinks ?? country.moreDrinks ?? []),
      country.wikipedia ? JSON.stringify(country.wikipedia) : null,
      JSON.stringify(country.specialtyShops ?? []),
      JSON.stringify(country.orderOptions ?? []),
      country.imageUrl ?? null,
      country.imageAttribution ?? null,
      country.dinner ? JSON.stringify(country.dinner) : null,
      country.cookReady,
      country.status,
    ],
  );
}

export async function replaceCountryRecipes(
  countryCode: string,
  entries: Array<{ recipe: Recipe; menuSlot: MenuSlot; sortOrder: number }>,
): Promise<void> {
  const db = await ensureDb();
  const code = countryCode.toLowerCase();
  await db.query(`DELETE FROM recipes WHERE country_code = $1`, [code]);

  const { resolve: resolveRegion } = await createRegionResolver(code);
  for (const entry of entries) {
    const { recipe, menuSlot, sortOrder } = entry;
    const region = await resolveRegion(
      recipe.region ?? recipe.regionName,
      recipe.regionId,
    );
    const regionId = region?.id ?? recipe.regionId ?? null;
    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, local_name, description,
        category, servings, prep_minutes, cook_minutes, wait_time, difficulty, dietary_labels,
        ingredients, steps, substitutions, serving_suggestion, drink_pairing,
        image_url, image_attribution, source_url, video_url, region_id, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14::jsonb,
        $15::jsonb, $16::jsonb, $17::jsonb, $18, $19,
        $20, $21, $22, $23, $24, NOW()
      )`,
      [
        code,
        recipe.id,
        menuSlot,
        sortOrder,
        recipe.name,
        recipe.localName ?? null,
        recipe.description,
        recipe.category,
        recipe.servings,
        recipe.prepMinutes,
        recipe.cookMinutes,
        recipe.waitTime?.trim() || null,
        recipe.difficulty,
        JSON.stringify(recipe.dietaryLabels),
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.steps),
        recipe.substitutions ? JSON.stringify(recipe.substitutions) : null,
        recipe.servingSuggestion ?? null,
        recipe.drinkPairing ?? null,
        recipe.imageUrl ?? null,
        recipe.imageAttribution ?? null,
        recipe.sourceUrl ?? null,
        recipe.videoUrl ?? null,
        regionId,
      ],
    );
  }
}

export async function countContentRows(): Promise<{
  countries: number;
  recipes: number;
}> {
  const db = await ensureDb();
  const countries = await db.query(`SELECT COUNT(*)::int AS n FROM countries`);
  const recipes = await db.query(`SELECT COUNT(*)::int AS n FROM recipes`);
  return {
    countries: Number(countries.rows[0]?.n ?? 0),
    recipes: Number(recipes.rows[0]?.n ?? 0),
  };
}

export type AdminCountryOverviewRow = {
  code: string;
  name: string;
  flag: string;
  region: string;
  status: Country["status"];
  cookReady: boolean;
  recipes: number;
  drinks: number;
  shops: number;
  restaurants: number;
};

export async function getAdminCountryOverview(): Promise<AdminCountryOverviewRow[]> {
  const [countries, restaurantCounts] = await Promise.all([
    listCountriesFromDb(),
    countByCuisineCode(),
  ]);

  return countries
    .map((country) => ({
      code: country.code,
      name: country.name,
      flag: country.flag,
      region: country.region,
      status: country.status,
      cookReady: country.cookReady,
      recipes: getCountryRecipes(country).length,
      drinks: getCountryDrinks(country).length,
      shops: getSpecialtyShops(country).length,
      restaurants: restaurantCounts[country.code] ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateCountryImage(
  code: string,
  imageUrl: string,
  imageAttribution?: string | null,
): Promise<Country | undefined> {
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET image_url = $2,
         image_attribution = $3,
         updated_at = NOW()
     WHERE code = $1`,
    [code.toLowerCase(), imageUrl, imageAttribution ?? null],
  );
  return getCountryFromDb(code);
}

export async function updateCountryText(
  code: string,
  introduction: string,
): Promise<Country | undefined> {
  const text = introduction.trim();
  if (text.length < 20) {
    throw new Error("Country text must be at least 20 characters.");
  }
  const existing = await getCountryFromDb(code);
  if (!existing) return undefined;

  const wikipedia = existing.wikipedia ? { ...existing.wikipedia, summary: text } : null;

  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET introduction = $2,
         wikipedia = $3,
         updated_at = NOW()
     WHERE code = $1`,
    [code.toLowerCase(), text, wikipedia ? JSON.stringify(wikipedia) : null],
  );
  return getCountryFromDb(code);
}

export async function listRecipeIdsForCountry(countryCode: string): Promise<string[]> {
  const db = await ensureDb();
  const result = await db.query(`SELECT id FROM recipes WHERE country_code = $1`, [
    countryCode.toLowerCase(),
  ]);
  return result.rows.map((row) => String(row.id));
}

function slugifyId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function appendMoreRecipes(
  countryCode: string,
  recipes: Recipe[],
): Promise<{ country: Country | undefined; inserted: Recipe[] }> {
  const db = await ensureDb();
  const code = countryCode.toLowerCase();
  const existing = new Set(await listRecipeIdsForCountry(code));
  const maxSort = await db.query(
    `SELECT COALESCE(MAX(sort_order), -1)::int AS n
     FROM recipes WHERE country_code = $1 AND menu_slot = 'more'`,
    [code],
  );
  let sortOrder = Number(maxSort.rows[0]?.n ?? -1) + 1;
  const inserted: Recipe[] = [];
  const { resolve: resolveRegion } = await createRegionResolver(code);

  for (const recipe of recipes) {
    let id = recipe.id?.trim() || slugifyId(recipe.name) || `dish-${sortOrder}`;
    if (existing.has(id)) {
      id = `${id}-${sortOrder}`;
    }
    existing.add(id);
    const region = await resolveRegion(
      recipe.region ?? recipe.regionName,
      recipe.regionId,
    );
    const regionId = region?.id ?? recipe.regionId ?? null;
    const saved: Recipe = {
      ...recipe,
      id,
      regionId: regionId ?? undefined,
      regionName: region?.name ?? recipe.regionName,
    };
    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, local_name, description,
        category, servings, prep_minutes, cook_minutes, wait_time, difficulty, dietary_labels,
        ingredients, steps, substitutions, serving_suggestion, drink_pairing,
        image_url, image_attribution, source_url, video_url, region_id, updated_at
      ) VALUES (
        $1, $2, 'more', $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13::jsonb,
        $14::jsonb, $15::jsonb, $16::jsonb, $17, $18,
        $19, $20, $21, $22, $23, NOW()
      )
      ON CONFLICT (country_code, id) DO UPDATE SET
        menu_slot = EXCLUDED.menu_slot,
        sort_order = EXCLUDED.sort_order,
        name = EXCLUDED.name,
        local_name = EXCLUDED.local_name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        servings = EXCLUDED.servings,
        prep_minutes = EXCLUDED.prep_minutes,
        cook_minutes = EXCLUDED.cook_minutes,
        wait_time = EXCLUDED.wait_time,
        difficulty = EXCLUDED.difficulty,
        dietary_labels = EXCLUDED.dietary_labels,
        ingredients = EXCLUDED.ingredients,
        steps = EXCLUDED.steps,
        substitutions = EXCLUDED.substitutions,
        serving_suggestion = EXCLUDED.serving_suggestion,
        drink_pairing = EXCLUDED.drink_pairing,
        image_url = EXCLUDED.image_url,
        image_attribution = EXCLUDED.image_attribution,
        source_url = EXCLUDED.source_url,
        video_url = EXCLUDED.video_url,
        region_id = EXCLUDED.region_id,
        updated_at = NOW()`,
      [
        code,
        id,
        sortOrder,
        saved.name,
        saved.localName ?? null,
        saved.description,
        saved.category,
        saved.servings,
        saved.prepMinutes,
        saved.cookMinutes,
        saved.waitTime?.trim() || null,
        saved.difficulty,
        JSON.stringify(saved.dietaryLabels),
        JSON.stringify(saved.ingredients),
        JSON.stringify(saved.steps),
        saved.substitutions ? JSON.stringify(saved.substitutions) : null,
        saved.servingSuggestion ?? null,
        saved.drinkPairing ?? null,
        saved.imageUrl ?? null,
        saved.imageAttribution ?? null,
        saved.sourceUrl ?? null,
        saved.videoUrl ?? null,
        regionId,
      ],
    );
    inserted.push(saved);
    sortOrder += 1;
  }

  return { country: await getCountryFromDb(code), inserted };
}

export async function getRecipeRow(
  countryCode: string,
  recipeId: string,
): Promise<{ recipe: Recipe; menuSlot: MenuSlot } | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT ${RECIPE_SELECT} ${RECIPE_FROM}
     WHERE country_code = $1 AND id = $2`,
    [countryCode.toLowerCase(), recipeId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    recipe: rowToRecipe(row),
    menuSlot: String(row.menu_slot) as MenuSlot,
  };
}

export async function deleteRecipe(
  countryCode: string,
  recipeId: string,
): Promise<boolean> {
  const db = await ensureDb();
  const result = await db.query(
    `DELETE FROM recipes WHERE country_code = $1 AND id = $2`,
    [countryCode.toLowerCase(), recipeId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateRecipeFields(
  countryCode: string,
  recipeId: string,
  patch: Partial<Recipe>,
): Promise<Recipe | null> {
  const existing = await getRecipeRow(countryCode, recipeId);
  if (!existing) return null;
  const next: Recipe = { ...existing.recipe, ...patch, id: existing.recipe.id };
  let regionId =
    patch.regionId !== undefined
      ? patch.regionId ?? null
      : existing.recipe.regionId ?? null;
  if (patch.region !== undefined || patch.regionName !== undefined) {
    const region = await findOrCreateRegion(
      countryCode,
      patch.region ?? patch.regionName,
    );
    regionId = region?.id ?? null;
    next.regionId = region?.id;
    next.regionName = region?.name;
  }
  const db = await ensureDb();
  await db.query(
    `UPDATE recipes SET
      name = $3,
      local_name = $4,
      description = $5,
      category = $6,
      servings = $7,
      prep_minutes = $8,
      cook_minutes = $9,
      wait_time = $10,
      difficulty = $11,
      dietary_labels = $12::jsonb,
      ingredients = $13::jsonb,
      steps = $14::jsonb,
      substitutions = $15::jsonb,
      serving_suggestion = $16,
      drink_pairing = $17,
      image_url = $18,
      image_attribution = $19,
      source_url = $20,
      video_url = $21,
      region_id = $22,
      updated_at = NOW()
     WHERE country_code = $1 AND id = $2`,
    [
      countryCode.toLowerCase(),
      recipeId,
      next.name,
      next.localName ?? null,
      next.description,
      next.category,
      next.servings,
      next.prepMinutes,
      next.cookMinutes,
      next.waitTime?.trim() || null,
      next.difficulty,
      JSON.stringify(next.dietaryLabels),
      JSON.stringify(next.ingredients),
      JSON.stringify(next.steps),
      next.substitutions ? JSON.stringify(next.substitutions) : null,
      next.servingSuggestion ?? null,
      next.drinkPairing ?? null,
      next.imageUrl ?? null,
      next.imageAttribution ?? null,
      next.sourceUrl ?? null,
      next.videoUrl ?? null,
      regionId,
    ],
  );
  if (!next.waitTime?.trim()) {
    delete next.waitTime;
  }
  return next;
}

export async function updateRecipeImage(
  countryCode: string,
  recipeId: string,
  imageUrl: string,
  imageAttribution?: string | null,
): Promise<Recipe | null> {
  return updateRecipeFields(countryCode, recipeId, {
    imageUrl,
    imageAttribution: imageAttribution ?? undefined,
  });
}

export async function removeSpecialtyShop(
  countryCode: string,
  shopId: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const shops = (country.specialtyShops ?? []).filter((shop) => shop.id !== shopId);
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET specialty_shops = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify(shops)],
  );
  return getCountryFromDb(countryCode);
}

export async function updateSpecialtyShop(
  countryCode: string,
  shopId: string,
  patch: Partial<SpecialtyShop>,
): Promise<{ country: Country; shop: SpecialtyShop } | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const shops = [...(country.specialtyShops ?? [])];
  const index = shops.findIndex((shop) => shop.id === shopId);
  if (index === -1) return undefined;
  const next = { ...shops[index]!, ...patch, id: shopId };
  shops[index] = next;
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET specialty_shops = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify(shops)],
  );
  const updated = await getCountryFromDb(countryCode);
  if (!updated) return undefined;
  return { country: updated, shop: next };
}

export async function appendSpecialtyShops(
  countryCode: string,
  shops: SpecialtyShop[],
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const byId = new Map((country.specialtyShops ?? []).map((shop) => [shop.id, shop]));
  for (const shop of shops) {
    const id =
      shop.id?.trim() ||
      slugifyId(`${shop.name}-${shop.city}`) ||
      `shop-${byId.size + 1}`;
    byId.set(id, { ...shop, id });
  }

  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET specialty_shops = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify([...byId.values()])],
  );
  return getCountryFromDb(countryCode);
}

export async function removeOrderOption(
  countryCode: string,
  optionId: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const options = (country.orderOptions ?? []).filter((option) => option.id !== optionId);
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET order_options = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify(options)],
  );
  return getCountryFromDb(countryCode);
}

export async function updateOrderOption(
  countryCode: string,
  optionId: string,
  patch: Partial<OrderOption>,
): Promise<{ country: Country; option: OrderOption } | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const options = [...(country.orderOptions ?? [])];
  const index = options.findIndex((option) => option.id === optionId);
  if (index === -1) return undefined;
  const next = { ...options[index]!, ...patch, id: optionId };
  options[index] = next;
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET order_options = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify(options)],
  );
  const updated = await getCountryFromDb(countryCode);
  if (!updated) return undefined;
  return { country: updated, option: next };
}

export async function appendOrderOptions(
  countryCode: string,
  options: OrderOption[],
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const byId = new Map((country.orderOptions ?? []).map((option) => [option.id, option]));
  for (const option of options) {
    const id =
      option.id?.trim() ||
      slugifyId(`${option.platform}-${option.name}-${option.city ?? "nl"}`) ||
      `order-${byId.size + 1}`;
    byId.set(id, { ...option, id });
  }

  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET order_options = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify([...byId.values()])],
  );
  return getCountryFromDb(countryCode);
}

function drinkKey(drink: Drink): string {
  return drink.name.trim().toLowerCase();
}

function drinkMatchesKey(drink: Drink, key: string): boolean {
  const needle = key.trim().toLowerCase();
  if (!needle) return false;
  if (drink.id?.trim().toLowerCase() === needle) return true;
  return drinkKey(drink) === needle;
}

export function publicDrinkKey(drink: Drink): string {
  return drink.id?.trim() || drink.name.trim();
}

type DrinkBuckets = {
  nationalDrink: Drink | null;
  menuDrink: Drink | null;
  moreDrinks: Drink[];
};

function readDrinkBuckets(country: Country): DrinkBuckets {
  return {
    nationalDrink: country.nationalDrink ?? null,
    menuDrink: country.menu?.drink ?? null,
    moreDrinks: [...(country.menu?.moreDrinks ?? country.moreDrinks ?? [])],
  };
}

function mapDrinkBuckets(
  buckets: DrinkBuckets,
  matcher: (drink: Drink) => boolean,
  map: (drink: Drink) => Drink | null,
): { buckets: DrinkBuckets; found: boolean } {
  let found = false;
  let nationalDrink = buckets.nationalDrink;
  if (nationalDrink && matcher(nationalDrink)) {
    found = true;
    nationalDrink = map(nationalDrink);
  }
  let menuDrink = buckets.menuDrink;
  if (menuDrink && matcher(menuDrink)) {
    found = true;
    menuDrink = map(menuDrink);
  }
  const moreDrinks: Drink[] = [];
  for (const drink of buckets.moreDrinks) {
    if (matcher(drink)) {
      found = true;
      const next = map(drink);
      if (next) moreDrinks.push(next);
    } else {
      moreDrinks.push(drink);
    }
  }
  return { buckets: { nationalDrink, menuDrink, moreDrinks }, found };
}

export async function removeCountryDrink(
  countryCode: string,
  drinkKeyValue: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const mapped = mapDrinkBuckets(
    readDrinkBuckets(country),
    (drink) => drinkMatchesKey(drink, drinkKeyValue),
    () => null,
  );
  if (!mapped.found) throw new Error("Drink not found.");
  return saveCountryDrinks(countryCode, mapped.buckets);
}

export async function updateCountryDrink(
  countryCode: string,
  drinkKeyValue: string,
  patch: Partial<Drink>,
): Promise<{ country: Country | undefined; drink: Drink }> {
  const country = await getCountryFromDb(countryCode);
  if (!country) throw new Error("Country not found.");
  let updatedDrink: Drink | null = null;
  const mapped = mapDrinkBuckets(
    readDrinkBuckets(country),
    (drink) => drinkMatchesKey(drink, drinkKeyValue),
    (drink) => {
      updatedDrink = { ...drink, ...patch, name: drink.name };
      return updatedDrink;
    },
  );
  if (!mapped.found || !updatedDrink) throw new Error("Drink not found.");
  const next = await saveCountryDrinks(countryCode, mapped.buckets);
  return { country: next, drink: updatedDrink };
}

function dinnerBaseForMutation(country: Country): DinnerSuggestion {
  const suggestion = getDinnerSuggestion(country);
  if (suggestion) return suggestion;
  return {
    title: `A taste of ${country.name}`,
    description: country.introduction,
    courses: [],
    drinks: country.dinner?.drinks ?? [],
  };
}

/** Append a drink to the dinner pour list (does not replace existing drinks). */
export async function addDrinkToDinner(
  countryCode: string,
  drinkKeyValue: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const drink = getCountryDrinks(country).find((item) =>
    drinkMatchesKey(item, drinkKeyValue),
  );
  if (!drink) throw new Error("Drink not found.");

  const base = dinnerBaseForMutation(country);

  const already = base.drinks.some(
    (item) => item.drinkName.trim().toLowerCase() === drinkKey(drink),
  );
  if (already) {
    return country;
  }

  const dinner: DinnerSuggestion = {
    ...base,
    drinks: [...base.drinks, { drinkName: drink.name }].slice(0, 6),
    composedAt: new Date().toISOString(),
  };
  return saveDinnerSuggestion(countryCode, dinner);
}

export async function removeDinnerCourse(
  countryCode: string,
  recipeId: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;
  const base = dinnerBaseForMutation(country);
  const nextCourses = base.courses.filter((course) => course.recipeId !== recipeId);
  if (nextCourses.length === base.courses.length) {
    return country;
  }
  const dinner: DinnerSuggestion = {
    ...base,
    courses: nextCourses,
    composedAt: new Date().toISOString(),
  };
  return saveDinnerSuggestion(countryCode, dinner);
}

export async function removeDinnerDrink(
  countryCode: string,
  drinkName: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const base = dinnerBaseForMutation(country);
  const needle = drinkName.trim().toLowerCase();
  const nextDrinks = base.drinks.filter(
    (item) => item.drinkName.trim().toLowerCase() !== needle,
  );
  if (nextDrinks.length === base.drinks.length) {
    return country;
  }

  const dinner: DinnerSuggestion = {
    ...base,
    drinks: nextDrinks,
    composedAt: new Date().toISOString(),
  };
  return saveDinnerSuggestion(countryCode, dinner);
}

export async function appendMoreDrinks(
  countryCode: string,
  drinks: Drink[],
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const existing = country.menu?.moreDrinks ?? country.moreDrinks ?? [];
  const byName = new Map(existing.map((drink) => [drinkKey(drink), drink]));
  for (const drink of drinks) {
    const key = drinkKey(drink);
    if (!key) continue;
    byName.set(key, drink);
  }

  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET more_drinks = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify([...byName.values()])],
  );
  return getCountryFromDb(countryCode);
}

/** Persist national / menu / more drinks JSONB for a country. */
export async function saveCountryDrinks(
  countryCode: string,
  input: {
    nationalDrink?: Drink | null;
    menuDrink?: Drink | null;
    moreDrinks: Drink[];
  },
): Promise<Country | undefined> {
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET national_drink = $2::jsonb,
         menu_drink = $3::jsonb,
         more_drinks = $4::jsonb,
         updated_at = NOW()
     WHERE code = $1`,
    [
      countryCode.toLowerCase(),
      input.nationalDrink ? JSON.stringify(input.nationalDrink) : null,
      input.menuDrink ? JSON.stringify(input.menuDrink) : null,
      JSON.stringify(input.moreDrinks),
    ],
  );
  return getCountryFromDb(countryCode);
}

export async function saveDinnerSuggestion(
  countryCode: string,
  dinner: DinnerSuggestion,
): Promise<Country | undefined> {
  const db = await ensureDb();
  await db.query(
    `UPDATE countries
     SET dinner_json = $2::jsonb, updated_at = NOW()
     WHERE code = $1`,
    [countryCode.toLowerCase(), JSON.stringify(dinner)],
  );
  return getCountryFromDb(countryCode);
}

/**
 * Set `recipeId` as the dinner course for its category role, replacing any
 * existing course with that role. Removes the recipe from other dinner slots.
 */
export async function selectRecipeForDinner(
  countryCode: string,
  recipeId: string,
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const row = await getRecipeRow(countryCode, recipeId);
  if (!row) {
    throw new Error("Recipe not found.");
  }

  const role = row.recipe.category;
  const base = dinnerBaseForMutation(country);

  const withoutRecipe = base.courses.filter((course) => course.recipeId !== recipeId);
  const existingIndex = withoutRecipe.findIndex((course) => course.role === role);
  const nextCourse = {
    recipeId,
    role,
    note: existingIndex >= 0 ? withoutRecipe[existingIndex]?.note : undefined,
  };

  let courses: DinnerSuggestion["courses"];
  if (existingIndex >= 0) {
    courses = withoutRecipe.map((course, index) =>
      index === existingIndex ? nextCourse : course,
    );
  } else if (withoutRecipe.length < 5) {
    courses = [...withoutRecipe, nextCourse];
  } else {
    // At capacity: replace the last course of matching role if any, else last slot.
    const lastSameRole = [...withoutRecipe]
      .map((course, index) => ({ course, index }))
      .reverse()
      .find((item) => item.course.role === role);
    if (lastSameRole) {
      courses = withoutRecipe.map((course, index) =>
        index === lastSameRole.index ? nextCourse : course,
      );
    } else {
      courses = [...withoutRecipe.slice(0, 4), nextCourse];
    }
  }

  // Keep a sensible course order: starter → main → side → dessert → snack → extra
  const roleOrder: Record<string, number> = {
    starter: 0,
    main: 1,
    side: 2,
    dessert: 3,
    snack: 4,
    extra: 5,
  };
  courses = [...courses].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9),
  );

  const dinner: DinnerSuggestion = {
    ...base,
    courses,
    composedAt: new Date().toISOString(),
  };

  return saveDinnerSuggestion(countryCode, dinner);
}
