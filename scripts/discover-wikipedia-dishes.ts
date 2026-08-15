#!/usr/bin/env tsx
/**
 * Discover notable dishes per country from Wikipedia (A→Z by country name).
 *
 * For each country:
 * 1. Open the cuisine page (from data/wikipedia-cuisines.json when available)
 * 2. Prefer a "List of … dishes" page when it exists
 * 3. Extract dish links from dish-related sections
 * 4. Enrich each dish with Wikipedia summary + recipe/video search links
 *    (and a Commons photo when found)
 *
 * Progress: data/dish-discover-progress.json
 * Output:   data/dishes-by-country.json
 *
 * Usage:
 *   npm run agent:dishes
 *   npm run agent:dishes -- --batch 5
 *   npm run agent:dishes -- --status
 *   npm run agent:dishes -- --from Afghanistan
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countryCatalog } from "../src/content/countries/catalog.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(rootDir, "data/dishes-by-country.json");
const PROGRESS_PATH = path.join(rootDir, "data/dish-discover-progress.json");
const WIKI_PATH = path.join(rootDir, "data/wikipedia-cuisines.json");
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; wikipedia dish discovery)";

type WikiCuisine = { title: string; summary: string; url: string };

type DishRecord = {
  name: string;
  wikipediaTitle: string;
  wikipediaUrl: string;
  summary?: string;
  imageUrl?: string;
  imageAttribution?: string;
  sourceUrl?: string;
  videoUrl?: string;
};

type CountryDishes = {
  code: string;
  name: string;
  cuisinePage?: string;
  listPage?: string;
  dishes: DishRecord[];
  fetchedAt: string;
};

type Progress = {
  completedCodes: string[];
  lifetimeCountries: number;
  lifetimeDishes: number;
  runs: number;
  lastRunAt: string | null;
  lastCountryName: string | null;
};

function loadWikiByCode(): Record<string, WikiCuisine> {
  try {
    return JSON.parse(fs.readFileSync(WIKI_PATH, "utf8")) as Record<string, WikiCuisine>;
  } catch {
    return {};
  }
}

const wikiByCode = loadWikiByCode();

const SKIP_LINK =
  /^(file|image|category|wikipedia|template|help|portal|module|draft|timedtext):/i;
const SKIP_TITLE =
  /\b(cuisine|list of|culture of|history of|geography|language|people|flag|embassy|airport|university|province|district|municipality|as food|fisheries term|side dish|national dish|breakfast|lunch|dinner|ingredient|ingredients)\b/i;
const GENERIC_DISH_TITLE =
  /^(bread|milk|yogurt|yoghurt|beef|pork|chicken|lamb|mutton|fish|rice|salt|sugar|water|tea|coffee|wine|beer|oil|butter|cheese|egg|eggs|potato|potatoes|tomato|tomatoes|onion|onions|garlic|pepper|soup|stew|salad|meat|seafood|fruit|vegetable|porridge|cassava|polenta|pine nut|shrimp and prawn as food|octopus as food|sardines as food|whitefish)$/i;
const DISH_SECTION =
  /\b(dish|dishes|food|foods|meal|meals|specialty|specialties|specialit|national|staple|soup|stew|bread|rice|meat|seafood|fish|dessert|pastry|street food|appetizer|starter|main course|breakfast|drink|beverage|salad)\b/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { batch: 5, status: false, from: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--status") args.status = true;
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 5));
    if (arg === "--from") args.from = String(argv[++i] ?? "");
  }
  return args;
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function saveJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function alphabeticalCountries() {
  return [...countryCatalog].sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      "Api-User-Agent": USER_AGENT,
    },
  });
  if (response.status === 404) return null;
  if (response.status === 429) {
    await sleep(1500);
    const retry = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Api-User-Agent": USER_AGENT,
      },
    });
    if (!retry.ok) return null;
    return (await retry.json()) as T;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function pageExists(title: string): Promise<boolean> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: title,
      format: "json",
      formatversion: "2",
      origin: "*",
    });
  const data = await fetchJson<{
    query?: { pages?: Array<{ missing?: boolean; title?: string }> };
  }>(url);
  const page = data?.query?.pages?.[0];
  return Boolean(page && !page.missing);
}

async function fetchWikitext(title: string): Promise<string | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "parse",
      page: title,
      prop: "wikitext",
      format: "json",
      formatversion: "2",
      origin: "*",
      redirects: "1",
    });
  const data = await fetchJson<{
    parse?: { wikitext?: string };
    error?: { code?: string };
  }>(url);
  if (data?.error) return null;
  return data?.parse?.wikitext ?? null;
}

function decodeWikiTitle(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function extractLinksFromWikitext(wikitext: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const linkRe = /\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(wikitext)) != null) {
    let title = decodeWikiTitle(match[1] ?? "");
    // Drop interlanguage / interwiki prefixes (:pt:Foo, fr:Bar)
    if (title.startsWith(":")) title = title.slice(1);
    if (/^[a-z]{2,3}:/i.test(title)) continue;
    if (!title || SKIP_LINK.test(title) || SKIP_TITLE.test(title)) continue;
    if (GENERIC_DISH_TITLE.test(title)) continue;
    if (title.length < 2 || title.length > 80) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(title);
  }
  return names;
}

function extractDishCandidates(wikitext: string): string[] {
  const chunks = wikitext.split(/\n(?==+)/);
  const fromSections: string[] = [];
  for (const chunk of chunks) {
    const headerMatch = chunk.match(/^==+\s*(.*?)\s*==+/);
    const header = headerMatch?.[1] ?? "";
    if (header && !DISH_SECTION.test(header)) continue;
    // Include lead section (no header) lightly — only if it mentions dishes later
    if (!header && chunks.indexOf(chunk) === 0) {
      // skip lead for link dump; too noisy
      continue;
    }
    fromSections.push(...extractLinksFromWikitext(chunk));
  }

  // Fallback: whole-page links if sections yielded nothing
  if (fromSections.length === 0) {
    return extractLinksFromWikitext(wikitext).slice(0, 40);
  }
  return fromSections;
}

function listPageCandidates(countryName: string, cuisineTitle?: string): string[] {
  const titles = [`List of ${countryName} dishes`, `List of foods of ${countryName}`];
  if (cuisineTitle) {
    const adj = cuisineTitle.replace(/\s+cuisine$/i, "").trim();
    if (adj && adj.toLowerCase() !== countryName.toLowerCase()) {
      titles.unshift(`List of ${adj} dishes`);
    }
  }
  return titles;
}

async function fetchSummary(title: string): Promise<{
  title: string;
  extract?: string;
  url: string;
  type?: string;
} | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const page = await fetchJson<{
    title?: string;
    extract?: string;
    type?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
  if (!page?.title) return null;
  if (page.type === "disambiguation") return null;
  return {
    title: page.title,
    extract: page.extract,
    type: page.type,
    url: page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
  };
}

async function findCommonsImage(
  query: string,
): Promise<{ url: string; attribution: string } | null> {
  const searchUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6",
      srlimit: "4",
      format: "json",
      origin: "*",
    });
  const search = await fetchJson<{
    query?: { search?: Array<{ title: string }> };
  }>(searchUrl);
  const hit = search?.query?.search?.[0];
  if (!hit?.title) return null;

  const infoUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: hit.title,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      format: "json",
      origin: "*",
    });
  const info = await fetchJson<{
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            url?: string;
            extmetadata?: {
              Artist?: { value?: string };
              LicenseShortName?: { value?: string };
            };
          }>;
        }
      >;
    };
  }>(infoUrl);
  const page = Object.values(info?.query?.pages ?? {})[0];
  const image = page?.imageinfo?.[0];
  if (!image?.url) return null;
  const license = image.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
  const artist = image.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").trim();
  return {
    url: image.url,
    attribution: artist ? `${artist} / ${license}` : `Wikimedia Commons / ${license}`,
  };
}

function looksLikeFoodSummary(title: string, extract: string): boolean {
  const hay = `${title} ${extract}`.toLowerCase();
  return /\b(dish|food|cuisine|recipe|cooked|soup|stew|bread|rice|meat|dessert|pastry|salad|meal|ingredient|fried|baked|grilled|traditional)\b/.test(
    hay,
  );
}

async function enrichDish(
  title: string,
  countryName: string,
): Promise<DishRecord | null> {
  const summary = await fetchSummary(title);
  if (!summary) return null;
  const extract = summary.extract ?? "";
  if (extract.length >= 40 && !looksLikeFoodSummary(summary.title, extract)) {
    return null;
  }

  let image: { url: string; attribution: string } | null = null;
  try {
    image = await findCommonsImage(`${summary.title} ${countryName} food`);
  } catch {
    image = null;
  }

  const q = `${summary.title} ${countryName} recipe`;
  return {
    name: summary.title,
    wikipediaTitle: summary.title,
    wikipediaUrl: summary.url,
    summary: extract || undefined,
    imageUrl: image?.url,
    imageAttribution: image?.attribution,
    sourceUrl: summary.url,
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  };
}

async function discoverForCountry(entry: {
  code: string;
  name: string;
}): Promise<CountryDishes> {
  const wiki = wikiByCode[entry.code];
  const cuisineTitle = wiki?.title;
  let listPage: string | undefined;
  let sourceTitle = cuisineTitle;

  for (const candidate of listPageCandidates(entry.name, cuisineTitle)) {
    if (await pageExists(candidate)) {
      listPage = candidate;
      sourceTitle = candidate;
      break;
    }
    await sleep(80);
  }

  if (!sourceTitle && cuisineTitle) sourceTitle = cuisineTitle;
  if (!sourceTitle) {
    // last resort: "{Name} cuisine"
    const guess = `${entry.name} cuisine`;
    if (await pageExists(guess)) sourceTitle = guess;
  }

  let candidates: string[] = [];
  if (sourceTitle) {
    const wikitext = await fetchWikitext(sourceTitle);
    if (wikitext) {
      candidates = listPage
        ? extractLinksFromWikitext(wikitext)
        : extractDishCandidates(wikitext);
    }
  }

  // Prefer unique, capped list before enrichment (API budget)
  const unique = [...new Set(candidates)].slice(0, 28);
  const dishes: DishRecord[] = [];

  for (const title of unique) {
    try {
      const dish = await enrichDish(title, entry.name);
      if (dish) dishes.push(dish);
    } catch (error) {
      console.warn(`    skip ${title}:`, error);
    }
    await sleep(160);
    if (dishes.length >= 12) break;
  }

  return {
    code: entry.code,
    name: entry.name,
    cuisinePage: wiki?.url,
    listPage: listPage
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(listPage.replace(/ /g, "_"))}`
      : undefined,
    dishes,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const countries = alphabeticalCountries();
  const progress = loadJson<Progress>(PROGRESS_PATH, {
    completedCodes: [],
    lifetimeCountries: 0,
    lifetimeDishes: 0,
    runs: 0,
    lastRunAt: null,
    lastCountryName: null,
  });
  const completed = new Set(progress.completedCodes);
  const byCountry = loadJson<Record<string, CountryDishes>>(OUT_PATH, {});

  let pending = countries.filter((c) => !completed.has(c.code));
  if (args.from) {
    const fromLower = args.from.toLowerCase();
    pending = pending.filter((c) => c.name.toLowerCase().localeCompare(fromLower) >= 0);
  }

  if (args.status) {
    console.log(
      `Dish discovery: ${completed.size}/${countries.length} countries · ${progress.lifetimeDishes} dishes lifetime`,
    );
    console.log(`Last: ${progress.lastCountryName ?? "never"}`);
    console.log("Next (A→Z):");
    for (const c of pending.slice(0, 10)) {
      console.log(`  - ${c.name} (${c.code})`);
    }
    return;
  }

  const batch = pending.slice(0, args.batch);
  console.log(
    `Dish discovery batch: ${batch.length} countries · ${Math.max(0, pending.length - batch.length)} remaining after`,
  );
  console.log(`Order: ${batch.map((c) => c.name).join(" → ") || "(none)"}`);

  let dishesThisRun = 0;
  for (const entry of batch) {
    process.stdout.write(`\n${entry.flag ?? ""} ${entry.name}… `);
    try {
      const result = await discoverForCountry(entry);
      byCountry[entry.code] = result;
      completed.add(entry.code);
      dishesThisRun += result.dishes.length;
      progress.lastCountryName = entry.name;
      console.log(
        `${result.dishes.length} dishes` +
          (result.listPage ? " (via list page)" : " (via cuisine page)"),
      );
      for (const dish of result.dishes.slice(0, 5)) {
        console.log(`  · ${dish.name}${dish.imageUrl ? " 📷" : ""}`);
      }
      if (result.dishes.length > 5) {
        console.log(`  · … +${result.dishes.length - 5} more`);
      }
    } catch (error) {
      console.log("failed");
      console.warn(error);
    }
    await sleep(300);
  }

  progress.completedCodes = [...completed];
  progress.lifetimeCountries += batch.length;
  progress.lifetimeDishes += dishesThisRun;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveJson(OUT_PATH, byCountry);
  saveJson(PROGRESS_PATH, progress);

  console.log(`\nWrote ${OUT_PATH}`);
  console.log(
    `Progress: ${completed.size}/${countries.length} countries · ${dishesThisRun} dishes this run · ${progress.lifetimeDishes} lifetime`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
