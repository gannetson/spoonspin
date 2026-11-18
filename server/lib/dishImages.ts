/**
 * Find a photo for a dish. Most obscure dishes have no Wikipedia lead image or Commons
 * search hit, which left two thirds of recipes without a picture, so this tries sources
 * in turn and stops at the first that yields a usable photo:
 *
 *   1. Wikipedia lead image of the dish's article
 *   2. Wikimedia Commons search (several phrasings)
 *   3. Wikidata `image` (P18) of a matching food item
 *   4. Openverse (Creative Commons photos, with attribution)
 *   5. TheMealDB (only when THEMEALDB_API_KEY is set; its free test key is not for production)
 *
 * Every result carries an attribution string, shown next to the photo.
 */
import {
  fetchJson,
  findCuisineImageFromQueries,
  resolveCommonsTitle,
  sameImageUrl,
} from "./wikimedia.ts";

export type DishImage = {
  url: string;
  attribution: string;
  source: "wikipedia" | "commons" | "wikidata" | "openverse" | "themealdb";
};

export type DishImageInput = {
  name: string;
  localName?: string;
  countryName: string;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const FOOD_WORDS =
  /\b(dish|food|cuisine|recipe|cooked|ingredient|meal|dessert|soup|stew|salad|bread|cake|pie|curry|pasta|rice|meat|fish|cheese|dumpling|sauce|snack|pastry|noodle|sandwich|beverage|drink)\b/i;

function isPhotoUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  return IMAGE_EXT.test(url) && !/\.(pdf|webm|svg|tif|tiff)(\?|$)/i.test(url);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Words of a dish name worth matching on (drops "with", "and", very short words). */
export function significantWords(name: string): string[] {
  return normalize(name)
    .split(" ")
    .filter((word) => word.length >= 4 && !["with", "and", "from", "style"].includes(word));
}

/** True when a candidate title shares a significant word with the dish name. */
export function titleMatchesDish(candidateTitle: string, dishName: string): boolean {
  const wanted = significantWords(dishName);
  if (wanted.length === 0) return true;
  const title = normalize(candidateTitle);
  return wanted.some((word) => title.includes(word));
}

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
};

async function wikipediaLeadImage(titles: string[]): Promise<DishImage | null> {
  for (const title of titles) {
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const page = await fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    ).catch(() => null);
    if (!page || page.type === "disambiguation") continue;
    if (!FOOD_WORDS.test(`${page.title ?? ""} ${page.extract ?? ""}`)) continue;
    const url = page.originalimage?.source ?? page.thumbnail?.source;
    if (isPhotoUrl(url)) {
      return { url, attribution: `Wikipedia / ${page.title ?? title}`, source: "wikipedia" };
    }
  }
  return null;
}

type WikidataSearch = {
  search?: Array<{ id: string; label?: string; description?: string }>;
};

type WikidataEntity = {
  entities?: Record<
    string,
    { claims?: { P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }
  >;
};

async function wikidataImage(names: string[]): Promise<DishImage | null> {
  for (const name of names) {
    const search = await fetchJson<WikidataSearch>(
      "https://www.wikidata.org/w/api.php?" +
        new URLSearchParams({
          action: "wbsearchentities",
          search: name,
          language: "en",
          type: "item",
          limit: "5",
          format: "json",
          origin: "*",
        }),
    ).catch(() => null);
    const hit = (search?.search ?? []).find(
      (item) => FOOD_WORDS.test(item.description ?? "") && titleMatchesDish(item.label ?? "", name),
    );
    if (!hit) continue;
    const entity = await fetchJson<WikidataEntity>(
      `https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`,
    ).catch(() => null);
    const file = entity?.entities?.[hit.id]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!file) continue;
    const resolved = await resolveCommonsTitle(`File:${file}`).catch(() => null);
    if (resolved) return { ...resolved, source: "wikidata" };
  }
  return null;
}

type OpenverseResponse = {
  results?: Array<{
    url?: string;
    title?: string;
    creator?: string;
    license?: string;
    license_version?: string;
    tags?: Array<{ name?: string }>;
  }>;
};

async function openverseImage(
  queries: string[],
  dishName: string,
  excludeUrls: string[],
): Promise<DishImage | null> {
  for (const query of queries) {
    const data = await fetchJson<OpenverseResponse>(
      "https://api.openverse.org/v1/images/?" +
        new URLSearchParams({
          q: query,
          category: "photograph",
          license_type: "commercial",
          page_size: "8",
          mature: "false",
        }),
    ).catch(() => null);
    for (const item of data?.results ?? []) {
      if (!isPhotoUrl(item.url)) continue;
      if (excludeUrls.some((url) => sameImageUrl(url, item.url!))) continue;
      const evidence = `${item.title ?? ""} ${(item.tags ?? []).map((t) => t.name).join(" ")}`;
      if (!titleMatchesDish(evidence, dishName)) continue;
      const license = [item.license?.toUpperCase(), item.license_version].filter(Boolean).join(" ");
      return {
        url: item.url,
        attribution: `${item.creator ?? "Unknown"} / ${license ? `CC ${license}` : "CC"} via Openverse`,
        source: "openverse",
      };
    }
  }
  return null;
}

type MealDbResponse = { meals?: Array<{ strMeal?: string; strMealThumb?: string }> | null };

async function mealDbImage(name: string): Promise<DishImage | null> {
  const key = process.env.THEMEALDB_API_KEY?.trim();
  if (!key) return null;
  const data = await fetchJson<MealDbResponse>(
    `https://www.themealdb.com/api/json/v1/${encodeURIComponent(key)}/search.php?s=${encodeURIComponent(name)}`,
  ).catch(() => null);
  const meal = (data?.meals ?? []).find(
    (item) => item.strMealThumb && titleMatchesDish(item.strMeal ?? "", name),
  );
  return meal?.strMealThumb && isPhotoUrl(meal.strMealThumb)
    ? { url: meal.strMealThumb, attribution: "TheMealDB", source: "themealdb" }
    : null;
}

export async function findDishImage(
  input: DishImageInput,
  options: { excludeUrls?: string[] } = {},
): Promise<DishImage | null> {
  const exclude = options.excludeUrls ?? [];
  const names = [input.localName, input.name].filter((n): n is string => Boolean(n?.trim()));
  const wikiTitles = [
    ...names,
    `${input.name} (${input.countryName})`,
    `${input.countryName} ${input.name}`,
  ];

  const lead = await wikipediaLeadImage(wikiTitles);
  if (lead && !exclude.some((url) => sameImageUrl(url, lead.url))) return lead;

  const commons = await findCuisineImageFromQueries(
    [
      `${input.name} ${input.countryName} food`,
      `${input.name} dish`,
      input.localName ? `${input.localName} food` : "",
      `${input.name} ${input.countryName}`,
      input.name,
    ],
    { excludeUrls: exclude },
  ).catch(() => null);
  if (commons) {
    return { url: commons.url, attribution: commons.attribution, source: "commons" };
  }

  const wikidata = await wikidataImage(names);
  if (wikidata && !exclude.some((url) => sameImageUrl(url, wikidata.url))) return wikidata;

  const openverse = await openverseImage(
    [`${input.name} ${input.countryName} food`, `${input.name} dish`],
    input.name,
    exclude,
  );
  if (openverse) return openverse;

  return mealDbImage(input.name);
}
