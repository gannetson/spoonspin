#!/usr/bin/env tsx
/**
 * Gather per-country cuisine / plate background images.
 *
 * Priority:
 *  1. National-dish photo from recipe enrichments (cook-ready countries)
 *  2. Wikipedia cuisine page lead image
 *  3. Wikimedia Commons search for cuisine / dish plates
 *
 * Progress: data/cuisine-image-progress.json
 * Output:   src/content/countries/cuisineImages.json
 *
 * Usage:
 *   npm run agent:cuisine-images
 *   npm run agent:cuisine-images -- --batch 40
 *   npm run agent:cuisine-images -- --status
 *   npm run agent:cuisine-images -- --all
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countryCatalog } from "../src/content/countries/catalog.ts";
import { authoredCountries } from "../src/content/countries/published.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(rootDir, "src/content/countries/cuisineImages.json");
const PROGRESS_PATH = path.join(rootDir, "data/cuisine-image-progress.json");
const WIKI_PATH = path.join(rootDir, "src/content/countries/wikipediaCuisines.json");
const RECIPE_ENRICH_PATH = path.join(rootDir, "src/content/recipes/enrichments.json");
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; cuisine background images)";

type CuisineImage = {
  imageUrl: string;
  imageAttribution?: string;
  source: "national-dish" | "wikipedia" | "commons";
  fetchedAt: string;
};

type Progress = {
  completedCodes: string[];
  lifetimeEnriched: number;
  runs: number;
  lastRunAt: string | null;
};

type WikiSummary = {
  title?: string;
  type?: string;
  originalimage?: { source?: string; width?: number; height?: number };
  thumbnail?: { source?: string; width?: number; height?: number };
};

type CommonsSearch = {
  query?: { search?: Array<{ title: string }> };
};

type CommonsImageInfo = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          mime?: string;
          descriptionurl?: string;
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
          };
        }>;
      }
    >;
  };
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { batch: 50, status: false, all: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--status") args.status = true;
    if (arg === "--all") args.all = true;
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 50));
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

function isPhotoUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (!IMAGE_EXT.test(url)) return false;
  if (/\.(pdf|webm|svg|tif|tiff)(\?|$)/i.test(url)) return false;
  return true;
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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

function nationalDishImage(code: string): CuisineImage | null {
  const authored = authoredCountries.find((country) => country.code === code);
  if (!authored) return null;
  const enrichments = loadJson<
    Record<string, { imageUrl?: string; imageAttribution?: string }>
  >(RECIPE_ENRICH_PATH, {});
  const key = `${code}:${authored.nationalDishId}`;
  const enrichment = enrichments[key];
  if (!isPhotoUrl(enrichment?.imageUrl)) return null;
  return {
    imageUrl: enrichment.imageUrl,
    imageAttribution: enrichment.imageAttribution,
    source: "national-dish",
    fetchedAt: new Date().toISOString(),
  };
}

async function wikipediaCuisineImage(
  code: string,
): Promise<CuisineImage | null> {
  const wikiByCode = loadJson<
    Record<string, { title?: string; url?: string }>
  >(WIKI_PATH, {});
  const wiki = wikiByCode[code];
  if (!wiki?.title) return null;

  const encoded = encodeURIComponent(wiki.title.replace(/ /g, "_"));
  const page = await fetchJson<WikiSummary>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
  );
  if (!page || page.type === "disambiguation") return null;

  const url = page.originalimage?.source ?? page.thumbnail?.source;
  if (!isPhotoUrl(url)) return null;

  return {
    imageUrl: url,
    imageAttribution: `Wikipedia / ${page.title ?? wiki.title}`,
    source: "wikipedia",
    fetchedAt: new Date().toISOString(),
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
      srlimit: "8",
      format: "json",
      origin: "*",
    });
  const search = await fetchJson<CommonsSearch>(searchUrl);
  const hits = search?.query?.search ?? [];

  for (const hit of hits) {
    if (!hit?.title) continue;
    if (/\.(pdf|webm|svg|tif|tiff)$/i.test(hit.title)) continue;

    const infoUrl =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        titles: hit.title,
        prop: "imageinfo",
        iiprop: "url|mime|extmetadata",
        format: "json",
        origin: "*",
      });
    const info = await fetchJson<CommonsImageInfo>(infoUrl);
    const page = Object.values(info?.query?.pages ?? {})[0];
    const image = page?.imageinfo?.[0];
    if (!image?.url) continue;
    if (image.mime && !IMAGE_MIME.test(image.mime)) continue;
    if (!isPhotoUrl(image.url)) continue;

    const license =
      image.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
    const artist = image.extmetadata?.Artist?.value
      ?.replace(/<[^>]+>/g, "")
      .trim();
    const attribution = artist
      ? `${artist} / ${license}`
      : `Wikimedia Commons / ${license}`;

    return { url: image.url, attribution };
  }

  return null;
}

async function commonsCuisineImage(
  code: string,
  name: string,
): Promise<CuisineImage | null> {
  const authored = authoredCountries.find((country) => country.code === code);
  const national = authored
    ? [
        authored.menu.starter,
        authored.menu.main,
        authored.menu.side,
        authored.menu.dessert,
        ...(authored.menu.moreRecipes ?? []),
      ].find((recipe) => recipe.id === authored.nationalDishId)
    : undefined;

  const queries = [
    national ? `${national.name} ${name} food` : null,
    national?.localName ? `${national.localName} food` : null,
    `${name} cuisine dish`,
    `${name} traditional food`,
    `${name} national dish`,
  ].filter((query): query is string => Boolean(query));

  for (const query of queries) {
    const image = await findCommonsImage(query);
    if (image) {
      return {
        imageUrl: image.url,
        imageAttribution: image.attribution,
        source: "commons",
        fetchedAt: new Date().toISOString(),
      };
    }
    await sleep(120);
  }

  return null;
}

async function enrichCountry(
  code: string,
  name: string,
): Promise<CuisineImage | null> {
  const fromDish = nationalDishImage(code);
  if (fromDish) return fromDish;

  const fromWiki = await wikipediaCuisineImage(code);
  if (fromWiki) return fromWiki;

  return commonsCuisineImage(code, name);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const progress = loadJson<Progress>(PROGRESS_PATH, {
    completedCodes: [],
    lifetimeEnriched: 0,
    runs: 0,
    lastRunAt: null,
  });
  const completed = new Set(progress.completedCodes);
  const images = loadJson<Record<string, CuisineImage>>(OUT_PATH, {});

  const authoredCodes = new Set(authoredCountries.map((country) => country.code));
  const entries = args.all
    ? countryCatalog
    : countryCatalog.filter(
        (entry) => authoredCodes.has(entry.code) || !images[entry.code]?.imageUrl,
      );

  // Prefer cook-ready first, then the rest of the catalog.
  const ordered = [
    ...entries.filter((entry) => authoredCodes.has(entry.code)),
    ...entries.filter((entry) => !authoredCodes.has(entry.code)),
  ];

  const pending = ordered.filter((entry) => {
    if (completed.has(entry.code) && images[entry.code]?.imageUrl) return false;
    return !images[entry.code]?.imageUrl;
  });

  if (args.status) {
    console.log(
      `Cuisine images: ${Object.keys(images).length} saved · ${pending.length} pending · ${countryCatalog.length} catalog`,
    );
    console.log(`Lifetime enriched: ${progress.lifetimeEnriched}`);
    console.log(`Last run: ${progress.lastRunAt ?? "never"}`);
    console.log("Next:");
    for (const entry of pending.slice(0, 12)) {
      console.log(`  - ${entry.code} ${entry.name}`);
    }
    return;
  }

  const batch = pending.slice(0, args.all ? pending.length : args.batch);
  console.log(
    `Cuisine image batch: ${batch.length} · ${pending.length - batch.length} remaining after`,
  );

  let enriched = 0;
  for (const entry of batch) {
    process.stdout.write(`${entry.code} ${entry.name}… `);
    try {
      const result = await enrichCountry(entry.code, entry.name);
      if (result) {
        images[entry.code] = result;
        completed.add(entry.code);
        enriched += 1;
        console.log(`${result.source}`);
      } else {
        console.log("no-image");
      }
    } catch (error) {
      console.log("failed");
      console.warn(error);
    }
    await sleep(200);
  }

  progress.completedCodes = [...completed];
  progress.lifetimeEnriched += enriched;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveJson(OUT_PATH, images);
  saveJson(PROGRESS_PATH, progress);

  console.log(`\nWrote ${OUT_PATH}`);
  console.log(
    `Progress: ${Object.keys(images).length}/${countryCatalog.length} · lifetime ${progress.lifetimeEnriched}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
