import type { QueryResultRow } from "pg";
import type {
  Country,
  Drink,
  Recipe,
  SpecialtyShop,
  WikipediaCuisine,
} from "../../src/types/content.ts";
import { ensureDb } from "./restaurants.ts";

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
    difficulty: String(row.difficulty) as Recipe["difficulty"],
    dietaryLabels: asArray<string>(row.dietary_labels),
    ingredients: asArray(row.ingredients),
    steps: asArray<string>(row.steps),
    substitutions: (() => {
      const value = asArray<string>(row.substitutions);
      return value.length > 0 ? value : undefined;
    })(),
    servingSuggestion:
      row.serving_suggestion == null
        ? undefined
        : String(row.serving_suggestion),
    drinkPairing:
      row.drink_pairing == null ? undefined : String(row.drink_pairing),
    imageUrl: row.image_url == null ? undefined : String(row.image_url),
    imageAttribution:
      row.image_attribution == null ? undefined : String(row.image_attribution),
    sourceUrl: row.source_url == null ? undefined : String(row.source_url),
    videoUrl: row.video_url == null ? undefined : String(row.video_url),
  };
}

function assembleCountry(
  row: QueryResultRow,
  recipes: Array<QueryResultRow>,
): Country {
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
    imageUrl: row.image_url == null ? undefined : String(row.image_url),
    imageAttribution:
      row.image_attribution == null
        ? undefined
        : String(row.image_attribution),
    cookReady,
    status: String(row.status) as Country["status"],
    standaloneRecipes:
      standaloneRecipes.length > 0 ? standaloneRecipes : undefined,
    moreDrinks:
      !hasFullMenu && moreDrinksList.length > 0 ? moreDrinksList : undefined,
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

export async function listCountriesFromDb(): Promise<Country[]> {
  const db = await ensureDb();
  const countries = await db.query(
    `SELECT * FROM countries ORDER BY name ASC`,
  );
  const recipes = await db.query(
    `SELECT * FROM recipes ORDER BY country_code, menu_slot, sort_order, id`,
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

export async function getCountryFromDb(
  code: string,
): Promise<Country | undefined> {
  const db = await ensureDb();
  const country = await db.query(`SELECT * FROM countries WHERE code = $1`, [
    code.toLowerCase(),
  ]);
  const row = country.rows[0];
  if (!row) return undefined;
  const recipes = await db.query(
    `SELECT * FROM recipes
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
      specialty_shops, image_url, image_attribution, cook_ready, status, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7::jsonb,
      $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
      $13::jsonb, $14, $15, $16, $17, NOW()
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
      image_url = COALESCE(EXCLUDED.image_url, countries.image_url),
      image_attribution = COALESCE(EXCLUDED.image_attribution, countries.image_attribution),
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
      JSON.stringify(country.menu?.moreDrinks ?? []),
      country.wikipedia ? JSON.stringify(country.wikipedia) : null,
      JSON.stringify(country.specialtyShops ?? []),
      country.imageUrl ?? null,
      country.imageAttribution ?? null,
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

  for (const entry of entries) {
    const { recipe, menuSlot, sortOrder } = entry;
    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, local_name, description,
        category, servings, prep_minutes, cook_minutes, difficulty, dietary_labels,
        ingredients, steps, substitutions, serving_suggestion, drink_pairing,
        image_url, image_attribution, source_url, video_url, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13::jsonb,
        $14::jsonb, $15::jsonb, $16::jsonb, $17, $18,
        $19, $20, $21, $22, NOW()
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

export async function listRecipeIdsForCountry(
  countryCode: string,
): Promise<string[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id FROM recipes WHERE country_code = $1`,
    [countryCode.toLowerCase()],
  );
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
): Promise<Country | undefined> {
  const db = await ensureDb();
  const code = countryCode.toLowerCase();
  const existing = new Set(await listRecipeIdsForCountry(code));
  const maxSort = await db.query(
    `SELECT COALESCE(MAX(sort_order), -1)::int AS n
     FROM recipes WHERE country_code = $1 AND menu_slot = 'more'`,
    [code],
  );
  let sortOrder = Number(maxSort.rows[0]?.n ?? -1) + 1;

  for (const recipe of recipes) {
    let id = recipe.id?.trim() || slugifyId(recipe.name) || `dish-${sortOrder}`;
    if (existing.has(id)) {
      id = `${id}-${sortOrder}`;
    }
    existing.add(id);
    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, local_name, description,
        category, servings, prep_minutes, cook_minutes, difficulty, dietary_labels,
        ingredients, steps, substitutions, serving_suggestion, drink_pairing,
        image_url, image_attribution, source_url, video_url, updated_at
      ) VALUES (
        $1, $2, 'more', $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12::jsonb,
        $13::jsonb, $14::jsonb, $15::jsonb, $16, $17,
        $18, $19, $20, $21, NOW()
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
        updated_at = NOW()`,
      [
        code,
        id,
        sortOrder,
        recipe.name,
        recipe.localName ?? null,
        recipe.description,
        recipe.category,
        recipe.servings,
        recipe.prepMinutes,
        recipe.cookMinutes,
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
      ],
    );
    sortOrder += 1;
  }

  return getCountryFromDb(code);
}

export async function getRecipeRow(
  countryCode: string,
  recipeId: string,
): Promise<{ recipe: Recipe; menuSlot: MenuSlot } | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT * FROM recipes WHERE country_code = $1 AND id = $2`,
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
      difficulty = $10,
      dietary_labels = $11::jsonb,
      ingredients = $12::jsonb,
      steps = $13::jsonb,
      substitutions = $14::jsonb,
      serving_suggestion = $15,
      drink_pairing = $16,
      image_url = $17,
      image_attribution = $18,
      source_url = $19,
      video_url = $20,
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
    ],
  );
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
  const shops = (country.specialtyShops ?? []).filter(
    (shop) => shop.id !== shopId,
  );
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

  const byId = new Map(
    (country.specialtyShops ?? []).map((shop) => [shop.id, shop]),
  );
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

function drinkKey(drink: Drink): string {
  return drink.name.trim().toLowerCase();
}

export async function appendMoreDrinks(
  countryCode: string,
  drinks: Drink[],
): Promise<Country | undefined> {
  const country = await getCountryFromDb(countryCode);
  if (!country) return undefined;

  const existing =
    country.menu?.moreDrinks ?? country.moreDrinks ?? [];
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
