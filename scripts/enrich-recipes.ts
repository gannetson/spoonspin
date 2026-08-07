#!/usr/bin/env tsx
/**
 * Enrich cook-ready recipes with:
 * - Dish photos (Wikimedia Commons / Wikipedia lead image)
 * - Links to Wikipedia / Wikibooks Cookbook / Google recipe search
 * - YouTube cooking-video search links
 *
 * Progress: data/recipe-enrich-progress.json
 * Output:   src/content/recipes/enrichments.json
 *
 * Usage:
 *   npm run agent:recipes
 *   npm run agent:recipes -- --batch 40
 *   npm run agent:recipes -- --all
 *   npm run agent:recipes -- --fix-bad
 *   npm run agent:recipes -- --status
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authoredCountries } from "../src/content/countries/published.ts";
import type { RecipeEnrichment } from "../src/content/recipes/enrichments.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(rootDir, "src/content/recipes/enrichments.json");
const PROGRESS_PATH = path.join(rootDir, "data/recipe-enrich-progress.json");
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; recipe media enricher)";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

type Progress = {
  completedIds: string[];
  lifetimeEnriched: number;
  runs: number;
  lastRunAt: string | null;
};

type Job = {
  id: string;
  countryCode: string;
  countryName: string;
  recipeId: string;
  recipeName: string;
  localName?: string;
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
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
          };
        }>;
      }
    >;
  };
};

type WikiSummary = {
  title?: string;
  type?: string;
  extract?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = {
    batch: 40,
    status: false,
    all: false,
    forceBad: false,
    forceLinks: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--status") args.status = true;
    if (arg === "--all") args.all = true;
    if (arg === "--force-bad") args.forceBad = true;
    if (arg === "--force-links") args.forceLinks = true;
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 40));
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

function hasBadOrMissingPhoto(extra?: RecipeEnrichment): boolean {
  if (!extra?.imageUrl) return true;
  return !isPhotoUrl(extra.imageUrl);
}

function listJobs(): Job[] {
  const jobs: Job[] = [];
  for (const country of authoredCountries) {
    const recipes = [
      country.menu.starter,
      country.menu.main,
      country.menu.side,
      country.menu.dessert,
      ...(country.menu.moreRecipes ?? []),
    ];
    for (const recipe of recipes) {
      jobs.push({
        id: `${country.code}:${recipe.id}`,
        countryCode: country.code,
        countryName: country.name,
        recipeId: recipe.id,
        recipeName: recipe.name,
        localName: recipe.localName,
      });
    }
  }
  return jobs;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Api-User-Agent": USER_AGENT,
      },
    });
    if (response.status === 404) return null;
    if (response.status === 429) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return (await response.json()) as T;
  }
  return null;
}

function attributionFromMeta(
  extmetadata:
    | {
        Artist?: { value?: string };
        LicenseShortName?: { value?: string };
      }
    | undefined,
): string {
  const license = extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
  const artist = extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").trim();
  return artist ? `${artist} / ${license}` : `Wikimedia Commons / ${license}`;
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

    return {
      url: image.url,
      attribution: attributionFromMeta(image.extmetadata),
    };
  }

  return null;
}

async function findWikipediaPage(
  titleCandidates: string[],
): Promise<WikiSummary | null> {
  for (const title of titleCandidates) {
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const page = await fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    );
    if (!page || page.type === "disambiguation") continue;
    const extract = page.extract ?? "";
    if (extract.length < 40) continue;
    if (
      !/\b(dish|food|cuisine|recipe|cooked|ingredient|meal|dessert|soup|stew|salad|bread|cake|pie|curry|pasta|rice|meat|fish|cheese)\b/i.test(
        `${page.title ?? ""} ${extract}`,
      )
    ) {
      continue;
    }
    return page;
  }
  return null;
}

async function findWikibooksCookbook(
  titleCandidates: string[],
): Promise<string | null> {
  const variants: string[] = [];
  for (const title of titleCandidates) {
    const clean = title.replace(/^Cookbook:/i, "").trim();
    if (!clean) continue;
    variants.push(
      `Cookbook:${clean}`,
      `Cookbook:${clean.replace(/\s+/g, "_")}`,
    );
    // Drop leading country/language adjectives for broader matches
    const stripped = clean.replace(
      /^(Dutch|Italian|Japanese|Mexican|Thai|Indian|French|German|Spanish|Greek|Turkish|Korean|Chinese|British|Polish|Portuguese|Brazilian|Peruvian|Argentine|Ethiopian|Moroccan|Lebanese|Vietnamese|Indonesian|Jamaican|Nigerian|Egyptian|Filipino|Bulgarian|Georgian|South African|Senegalese)\s+/i,
      "",
    );
    if (stripped !== clean) variants.push(`Cookbook:${stripped}`);
  }

  const seen = new Set<string>();
  for (const cookbookTitle of variants) {
    const key = cookbookTitle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const encoded = encodeURIComponent(cookbookTitle.replace(/ /g, "_"));
    const page = await fetchJson<WikiSummary>(
      `https://en.wikibooks.org/api/rest_v1/page/summary/${encoded}`,
    );
    if (!page || page.type === "disambiguation") continue;
    if (!page.title || !/^Cookbook:/i.test(page.title)) continue;

    return (
      page.content_urls?.desktop?.page ??
      `https://en.wikibooks.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
    );
  }
  return null;
}

function youtubeSearchUrl(recipeName: string, countryName: string): string {
  const q = `${recipeName} ${countryName} recipe`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function googleRecipeSearchUrl(recipeName: string, countryName: string): string {
  // Google recipe filter (udm=18) surfaces recipe cards with ingredients/steps.
  const q = `${recipeName} ${countryName} recipe`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}&udm=18`;
}

async function enrichJob(
  job: Job,
  options: { keepPhoto?: boolean; existing?: RecipeEnrichment } = {},
): Promise<RecipeEnrichment> {
  const nameCandidates = [
    job.localName,
    job.recipeName,
    `${job.recipeName} (${job.countryName})`,
  ].filter((t): t is string => Boolean(t));

  const imageQueries = [
    `${job.recipeName} ${job.countryName} food`,
    `${job.recipeName} dish`,
    job.localName ? `${job.localName} food` : null,
    `${job.recipeName} ${job.countryName}`,
    // Broader fallbacks for snack / side dishes with sparse Commons results
    job.localName ? `${job.localName}` : null,
    `${job.recipeName}`,
  ].filter((q): q is string => Boolean(q));

  let image: { url: string; attribution: string } | null = null;

  if (!options.keepPhoto) {
    const wikiPageForImage = await findWikipediaPage(nameCandidates);
    const wikiImage =
      wikiPageForImage?.originalimage?.source ??
      wikiPageForImage?.thumbnail?.source;
    if (isPhotoUrl(wikiImage)) {
      image = {
        url: wikiImage,
        attribution: `Wikipedia / ${wikiPageForImage?.title ?? job.recipeName}`,
      };
    }

    if (!image) {
      for (const query of imageQueries) {
        image = await findCommonsImage(query);
        if (image) break;
        await sleep(100);
      }
    }
  }

  const wikiPage = await findWikipediaPage(nameCandidates);

  const cookbookUrl = await findWikibooksCookbook([
    job.localName ?? "",
    job.recipeName,
    job.recipeName.replace(
      /^(Dutch|Italian|Japanese|Mexican|Thai|Indian|French|German|Spanish|Greek|Turkish|Korean|Chinese|British|Polish|Portuguese|Brazilian|Peruvian|Argentine|Ethiopian|Moroccan|Lebanese|Vietnamese|Indonesian|Jamaican|Nigerian|Egyptian|Filipino|Bulgarian|Georgian|South African|Senegalese)\s+/i,
      "",
    ),
  ].filter(Boolean));

  const wikiUrl =
    wikiPage?.content_urls?.desktop?.page ??
    (wikiPage?.title
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiPage.title.replace(/ /g, "_"))}`
      : null);

  const googleUrl = googleRecipeSearchUrl(job.recipeName, job.countryName);
  const existingSource = options.existing?.sourceUrl;
  const sourceRank = (url?: string) => {
    if (!url) return 0;
    if (url.includes("wikibooks.org")) return 3;
    if (url.includes("wikipedia.org")) return 2;
    if (url.includes("google.com")) return 1;
    return 1;
  };
  const candidates = [cookbookUrl, wikiUrl, existingSource, googleUrl].filter(
    (url): url is string => Boolean(url),
  );
  const sourceUrl = candidates.sort(
    (a, b) => sourceRank(b) - sourceRank(a),
  )[0]!;

  const result: RecipeEnrichment = {
    sourceUrl,
    videoUrl: youtubeSearchUrl(job.recipeName, job.countryName),
    fetchedAt: new Date().toISOString(),
  };

  if (image) {
    result.imageUrl = image.url;
    result.imageAttribution = image.attribution;
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jobs = listJobs();
  const progress = loadJson<Progress>(PROGRESS_PATH, {
    completedIds: [],
    lifetimeEnriched: 0,
    runs: 0,
    lastRunAt: null,
  });
  const completed = new Set(progress.completedIds);
  const enrichments = loadJson<Record<string, RecipeEnrichment>>(OUT_PATH, {});

  if (args.forceBad) {
    for (const [id, extra] of Object.entries(enrichments)) {
      if (hasBadOrMissingPhoto(extra)) {
        completed.delete(id);
        delete enrichments[id];
      }
    }
  }

  const pending = jobs.filter((job) => {
    const existing = enrichments[job.id];
    if (args.forceLinks) return true;
    if (args.forceBad && hasBadOrMissingPhoto(existing)) return true;
    if (
      completed.has(job.id) &&
      existing?.sourceUrl &&
      existing?.videoUrl &&
      isPhotoUrl(existing.imageUrl)
    ) {
      return false;
    }
    return !(
      isPhotoUrl(existing?.imageUrl) &&
      existing?.sourceUrl &&
      existing?.videoUrl
    );
  });

  if (args.status) {
    const withPhoto = jobs.filter((job) =>
      isPhotoUrl(enrichments[job.id]?.imageUrl),
    ).length;
    const withSource = jobs.filter((job) => enrichments[job.id]?.sourceUrl)
      .length;
    console.log(
      `Recipe enrich: ${withPhoto} photos · ${withSource} sources · ${pending.length} pending · ${jobs.length} total`,
    );
    console.log(`Lifetime enriched: ${progress.lifetimeEnriched}`);
    console.log(`Last run: ${progress.lastRunAt ?? "never"}`);
    console.log("Next:");
    for (const job of pending.slice(0, 10)) {
      console.log(`  - ${job.id} (${job.recipeName})`);
    }
    return;
  }

  const batch = pending.slice(0, args.all ? pending.length : args.batch);
  console.log(
    `Recipe enrich batch: ${batch.length} job(s) · ${pending.length - batch.length} remaining after`,
  );

  let enriched = 0;
  for (const job of batch) {
    process.stdout.write(`Enrich ${job.id}… `);
    try {
      const existing = enrichments[job.id];
      const keepPhoto =
        args.forceLinks && !args.forceBad && isPhotoUrl(existing?.imageUrl);
      const result = await enrichJob(job, { keepPhoto, existing });
      enrichments[job.id] = {
        ...existing,
        ...result,
        imageUrl: result.imageUrl ?? existing?.imageUrl,
        imageAttribution: result.imageAttribution ?? existing?.imageAttribution,
      };
      completed.add(job.id);
      enriched += 1;
      const sourceKind = result.sourceUrl?.includes("wikibooks")
        ? "cookbook"
        : result.sourceUrl?.includes("wikipedia")
          ? "wiki"
          : result.sourceUrl?.includes("google")
            ? "google"
            : "source";
      const photo = isPhotoUrl(enrichments[job.id]?.imageUrl)
        ? "photo"
        : "no-photo";
      console.log(
        [photo, sourceKind, result.videoUrl ? "video" : null]
          .filter(Boolean)
          .join("+"),
      );
    } catch (error) {
      console.log("failed");
      console.warn(error);
    }
    await sleep(200);
  }

  progress.completedIds = [...completed];
  progress.lifetimeEnriched += enriched;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveJson(OUT_PATH, enrichments);
  saveJson(PROGRESS_PATH, progress);

  console.log(`\nWrote ${OUT_PATH}`);
  console.log(
    `Progress: ${completed.size}/${jobs.length} · lifetime ${progress.lifetimeEnriched}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
