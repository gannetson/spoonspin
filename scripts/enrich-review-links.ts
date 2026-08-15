#!/usr/bin/env tsx
/**
 * Resolve real Tripadvisor / The Fork / OpenTable restaurant profile URLs.
 * Reads/writes Postgres reviewed restaurants only (progress in data/).
 *
 * Primary: DuckDuckGo HTML via jina reader (returns real indexed profile URLs).
 * Secondary: OpenAI web_search sources only (never model-invented message URLs).
 *
 * Usage:
 *   npm run agent:review-links
 *   npm run agent:review-links -- --batch 20
 *   npm run agent:review-links -- --status
 *   npm run agent:review-links -- --force
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeDb,
  getDb,
  listRestaurants,
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";
import {
  aggregateGuestRating,
  type RestaurantRatings,
  type SourceRating,
} from "../src/restaurants/ratings.ts";
import { pickReviewProfileUrl } from "../src/restaurants/reviewLinks.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_PATH = path.join(rootDir, "data/review-link-progress.json");

type Progress = {
  completedIds: string[];
  lifetimeResolved: number;
  runs: number;
  lastRunAt: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const status = argv.includes("--status");
  const force = argv.includes("--force");
  const batchIdx = argv.indexOf("--batch");
  const batch = batchIdx >= 0 ? Math.max(1, Number(argv[batchIdx + 1] || 20)) : 20;
  return { status, force, batch };
}

function loadProgress(): Progress {
  if (!fs.existsSync(PROGRESS_PATH)) {
    return {
      completedIds: [],
      lifetimeResolved: 0,
      runs: 0,
      lastRunAt: null,
    };
  }
  return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")) as Progress;
}

function saveProgress(progress: Progress) {
  fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`);
}

/** Keep searching until Tripadvisor + The Fork profiles exist (OpenTable optional). */
function needsResolution(place: StoredRestaurant, force: boolean): boolean {
  if (force) return true;
  const ratings = place.ratings ?? {};
  return !(ratings.tripadvisor?.url && ratings.theFork?.url);
}

function extractCandidateUrls(text: string): string[] {
  const urls = new Set<string>();

  for (const match of text.matchAll(/uddg=([^&\s)"']+)/g)) {
    try {
      urls.add(decodeURIComponent(match[1]));
    } catch {
      /* ignore */
    }
  }

  for (const match of text.matchAll(
    /https?:\/\/(?:www\.)?(?:tripadvisor|thefork|opentable)[a-z0-9.-]*\/[^\s)\]>"']+/gi,
  )) {
    urls.add(match[0].replace(/[.,;]+$/, ""));
  }

  return [...urls];
}

async function duckDuckGoSources(query: string): Promise<string[]> {
  const target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(`https://r.jina.ai/${target}`, {
    headers: {
      Accept: "text/plain",
      "User-Agent": "spoonspin-review-links/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo/jina ${response.status}`);
  }
  return extractCandidateUrls(await response.text());
}

async function openAiWebSearchSources(query: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      tool_choice: "required",
      temperature: 0,
      input: `Search for restaurant profile pages (Tripadvisor Restaurant_Review, The Fork /restaurant/…-r…, OpenTable /r/…).\nQuery: ${query}\nReply briefly. Do not invent URLs.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI web search ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    output?: Array<{
      type?: string;
      action?: { sources?: Array<{ url?: string }> };
    }>;
  };

  const urls: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "web_search_call") continue;
    for (const source of item.action?.sources ?? []) {
      if (source.url) urls.push(source.url);
    }
  }
  return urls;
}

async function resolveLinks(place: StoredRestaurant): Promise<{
  tripadvisor?: string;
  theFork?: string;
  openTable?: string;
}> {
  const ratings = place.ratings ?? {};
  const needTa = !ratings.tripadvisor?.url;
  const needFork = !ratings.theFork?.url;
  const needOt = !ratings.openTable?.url;

  const base = `"${place.name}" ${place.city}`;
  const ddgQueries: string[] = [];
  if (needTa) ddgQueries.push(`${base} tripadvisor Restaurant_Review`);
  if (needFork) {
    ddgQueries.push(`${base} site:thefork.nl/restaurant`);
    ddgQueries.push(`${place.name} ${place.city} thefork restaurant`);
  }
  if (needOt) ddgQueries.push(`${base} site:opentable.nl/r`);

  const allSources: string[] = [];
  for (const query of ddgQueries) {
    try {
      allSources.push(...(await duckDuckGoSources(query)));
      await sleep(600);
    } catch (error) {
      console.warn(
        ` ddg (${query.slice(0, 40)}…): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const restaurant = { name: place.name, city: place.city };
  let tripadvisor = needTa
    ? pickReviewProfileUrl("tripadvisor", allSources, restaurant)
    : null;
  let theFork = needFork ? pickReviewProfileUrl("theFork", allSources, restaurant) : null;
  let openTable = needOt
    ? pickReviewProfileUrl("openTable", allSources, restaurant)
    : null;

  if ((needTa && !tripadvisor) || (needFork && !theFork) || (needOt && !openTable)) {
    try {
      const openaiSources = await openAiWebSearchSources(
        `${base} Netherlands tripadvisor thefork opentable`,
      );
      allSources.push(...openaiSources);
      if (needTa && !tripadvisor) {
        tripadvisor = pickReviewProfileUrl("tripadvisor", allSources, restaurant);
      }
      if (needFork && !theFork) {
        theFork = pickReviewProfileUrl("theFork", allSources, restaurant);
      }
      if (needOt && !openTable) {
        openTable = pickReviewProfileUrl("openTable", allSources, restaurant);
      }
    } catch (error) {
      console.warn(` openai: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    tripadvisor: tripadvisor ?? undefined,
    theFork: theFork ?? undefined,
    openTable: openTable ?? undefined,
  };
}

function mergeUrl(
  existing: SourceRating | undefined,
  url: string | undefined,
): SourceRating | undefined {
  if (!url) return existing;
  // Keep the first verified profile URL; do not thrash on later searches.
  if (existing?.url) return existing;
  return {
    ...(existing ?? {}),
    url,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await getDb();
  const places = await listRestaurants({ reviewedOnly: true });
  const progress = loadProgress();

  const pending = places
    .filter((place) => needsResolution(place, args.force))
    .sort((a, b) => {
      const score = (place: StoredRestaurant) =>
        (place.ratings?.tripadvisor?.url ? 1 : 0) + (place.ratings?.theFork?.url ? 1 : 0);
      return score(a) - score(b);
    });

  if (args.status) {
    const withTa = places.filter((p) => p.ratings?.tripadvisor?.url).length;
    const withFork = places.filter((p) => p.ratings?.theFork?.url).length;
    const withOt = places.filter((p) => p.ratings?.openTable?.url).length;
    console.log(
      `Review links: TA ${withTa} · Fork ${withFork} · OpenTable ${withOt} / ${places.length}`,
    );
    console.log(`Pending (missing TA or Fork): ${pending.length}`);
    console.log(`Lifetime URL gains: ${progress.lifetimeResolved}`);
    console.log("Next:");
    for (const place of pending.slice(0, 8)) {
      console.log(`  - ${place.id} · ${place.name} (${place.city})`);
    }
    await closeDb();
    return;
  }

  const batch = pending.slice(0, args.batch);
  console.log(
    `Review-link batch: ${batch.length} · ${Math.max(0, pending.length - batch.length)} remaining after`,
  );

  let resolved = 0;
  const fullyDone = new Set(
    places.filter((place) => !needsResolution(place, false)).map((place) => place.id),
  );

  for (const place of batch) {
    process.stdout.write(`${place.name} (${place.city})…`);
    try {
      const found = await resolveLinks(place);
      const ratings: RestaurantRatings = { ...(place.ratings ?? {}) };
      const before = {
        ta: ratings.tripadvisor?.url,
        fork: ratings.theFork?.url,
        ot: ratings.openTable?.url,
      };

      ratings.tripadvisor = mergeUrl(ratings.tripadvisor, found.tripadvisor);
      ratings.theFork = mergeUrl(ratings.theFork, found.theFork);
      ratings.openTable = mergeUrl(ratings.openTable, found.openTable);

      const after = {
        ta: ratings.tripadvisor?.url,
        fork: ratings.theFork?.url,
        ot: ratings.openTable?.url,
      };
      const gained =
        (after.ta && after.ta !== before.ta ? 1 : 0) +
        (after.fork && after.fork !== before.fork ? 1 : 0) +
        (after.ot && after.ot !== before.ot ? 1 : 0);

      const aggregated = aggregateGuestRating(ratings);

      await upsertRestaurant({
        ...place,
        ratings,
        userRating: aggregated.rating ?? null,
        reviewCount: aggregated.reviewCount ?? null,
      });

      resolved += gained;
      if (after.ta && after.fork) fullyDone.add(place.id);
      console.log(
        ` TA=${after.ta ? "yes" : "—"} Fork=${after.fork ? "yes" : "—"} OT=${after.ot ? "yes" : "—"} (+${gained})`,
      );
    } catch (error) {
      console.log(` failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(400);
  }

  progress.completedIds = [...fullyDone];
  progress.lifetimeResolved += resolved;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveProgress(progress);
  await closeDb();

  console.log(
    `\nLinks gained this run: ${resolved} · lifetime ${progress.lifetimeResolved}`,
  );
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
