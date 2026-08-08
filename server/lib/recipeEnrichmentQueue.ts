/**
 * Background enrichment for newly added recipes:
 * expand stub → image (Wikimedia).
 * Runs in-process (no external queue); jobs are fire-and-forget after admin add.
 */

import {
  getRecipeRow,
  updateRecipeFields,
  updateRecipeImage,
} from "../db/content.ts";
import {
  discoverItemImageQueries,
  expandDishCandidates,
  type DishCandidate,
} from "../openai/adminDiscover.ts";
import { findCuisineImageFromQueries } from "./wikimedia.ts";
import type { Recipe } from "../../src/types/content.ts";

export type RecipeEnrichmentJob = {
  countryCode: string;
  countryName: string;
  recipeId: string;
  /** When set, expand this candidate into a full recipe before image lookup. */
  candidate?: DishCandidate;
};

const queue: RecipeEnrichmentJob[] = [];
const queuedIds = new Set<string>();
let running = false;

function jobKey(job: RecipeEnrichmentJob): string {
  return `${job.countryCode.toLowerCase()}:${job.recipeId}`;
}

export function scheduleRecipeEnrichment(job: RecipeEnrichmentJob): void {
  const key = jobKey(job);
  if (queuedIds.has(key)) return;
  queuedIds.add(key);
  queue.push(job);
  void drainQueue();
}

export function scheduleRecipeEnrichments(
  jobs: RecipeEnrichmentJob[],
): number {
  let scheduled = 0;
  for (const job of jobs) {
    const key = jobKey(job);
    if (queuedIds.has(key)) continue;
    queuedIds.add(key);
    queue.push(job);
    scheduled += 1;
  }
  if (scheduled > 0) void drainQueue();
  return scheduled;
}

async function drainQueue(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await enrichRecipeFully(job);
      } catch (error) {
        console.error(
          `Recipe enrichment failed for ${job.countryCode}/${job.recipeId}`,
          error,
        );
      } finally {
        queuedIds.delete(jobKey(job));
      }
    }
  } finally {
    running = false;
    if (queue.length > 0) void drainQueue();
  }
}

export async function enrichRecipeFully(
  job: RecipeEnrichmentJob,
): Promise<void> {
  const { countryCode, countryName, recipeId, candidate } = job;
  console.info(`[recipe-enrich] start ${countryCode}/${recipeId}`);

  if (candidate) {
    await expandStub(job).catch((error) => {
      console.warn(
        `[recipe-enrich] expand failed ${countryCode}/${recipeId}`,
        error,
      );
    });
  }

  await enrichImage(countryCode, countryName, recipeId).catch((error) => {
    console.warn(
      `[recipe-enrich] image failed ${countryCode}/${recipeId}`,
      error,
    );
  });

  console.info(`[recipe-enrich] done ${countryCode}/${recipeId}`);
}

async function expandStub(job: RecipeEnrichmentJob): Promise<void> {
  const candidate = job.candidate;
  if (!candidate) return;

  const expanded = await expandDishCandidates({
    countryCode: job.countryCode,
    countryName: job.countryName,
    dishes: [
      {
        ...candidate,
        id: job.recipeId,
      },
    ],
  });
  const recipe = expanded[0];
  if (!recipe) return;

  const patch: Partial<Recipe> = {
    name: recipe.name,
    localName: recipe.localName,
    description: recipe.description,
    category: recipe.category,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    dietaryLabels: recipe.dietaryLabels,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    substitutions: recipe.substitutions,
    servingSuggestion: recipe.servingSuggestion,
    drinkPairing: recipe.drinkPairing,
    sourceUrl: recipe.sourceUrl,
    videoUrl: recipe.videoUrl,
  };
  await updateRecipeFields(job.countryCode, job.recipeId, patch);
}

async function enrichImage(
  countryCode: string,
  countryName: string,
  recipeId: string,
): Promise<void> {
  const row = await getRecipeRow(countryCode, recipeId);
  if (!row) return;
  if (row.recipe.imageUrl?.trim()) return;

  const recipe = row.recipe;
  const discovered = await discoverItemImageQueries({
    kind: "recipe",
    countryName,
    title: recipe.name,
    detail: recipe.localName ?? recipe.description.slice(0, 160),
  });
  const queries = [
    ...discovered.searchQueries,
    `${recipe.name} food`,
    `${recipe.name} ${countryName}`,
    `${recipe.localName ?? recipe.name} dish`,
  ];
  const image = await findCuisineImageFromQueries(queries, {
    excludeUrls: [recipe.imageUrl],
  });
  if (!image) return;

  await updateRecipeImage(
    countryCode,
    recipeId,
    image.url,
    image.attribution,
  );
}
