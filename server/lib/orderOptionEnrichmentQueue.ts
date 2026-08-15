/**
 * Background enrichment for newly added order options:
 * text (signature dish / notes) → image (Wikimedia).
 * Runs in-process (no external queue); jobs are fire-and-forget after admin add.
 */

import { getCountryFromDb, updateOrderOption } from "../db/content.ts";
import {
  discoverItemImageQueries,
  isOpenAiConfigured,
  rewriteOrderOptionText,
} from "../openai/adminDiscover.ts";
import { findCuisineImageFromQueries } from "./wikimedia.ts";

export type OrderOptionEnrichmentJob = {
  countryCode: string;
  countryName: string;
  optionId: string;
};

const queue: OrderOptionEnrichmentJob[] = [];
const queuedIds = new Set<string>();
let running = false;

function jobKey(job: OrderOptionEnrichmentJob): string {
  return `${job.countryCode.toLowerCase()}:${job.optionId}`;
}

export function scheduleOrderOptionEnrichment(job: OrderOptionEnrichmentJob): void {
  const key = jobKey(job);
  if (queuedIds.has(key)) return;
  queuedIds.add(key);
  queue.push(job);
  void drainQueue();
}

export function scheduleOrderOptionEnrichments(jobs: OrderOptionEnrichmentJob[]): number {
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
        await enrichOrderOptionFully(job);
      } catch (error) {
        console.error(
          `Order option enrichment failed for ${job.countryCode}/${job.optionId}`,
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

export async function enrichOrderOptionFully(
  job: OrderOptionEnrichmentJob,
): Promise<void> {
  const { countryCode, countryName, optionId } = job;
  console.info(`[order-enrich] start ${countryCode}/${optionId}`);

  if (!isOpenAiConfigured()) {
    console.info(
      `[order-enrich] skip ${countryCode}/${optionId} (OpenAI not configured)`,
    );
    return;
  }

  // Text first so signatureDish / specialty notes improve the image search.
  await enrichText(countryCode, countryName, optionId).catch((error) => {
    console.warn(`[order-enrich] text failed ${countryCode}/${optionId}`, error);
  });
  await enrichImage(countryCode, countryName, optionId).catch((error) => {
    console.warn(`[order-enrich] image failed ${countryCode}/${optionId}`, error);
  });

  console.info(`[order-enrich] done ${countryCode}/${optionId}`);
}

async function enrichText(
  countryCode: string,
  countryName: string,
  optionId: string,
): Promise<void> {
  const country = await getCountryFromDb(countryCode);
  const option = (country?.orderOptions ?? []).find((item) => item.id === optionId);
  if (!option) return;

  const rewritten = await rewriteOrderOptionText({
    countryName,
    option,
  });
  await updateOrderOption(countryCode, optionId, rewritten.patch);
}

async function enrichImage(
  countryCode: string,
  countryName: string,
  optionId: string,
): Promise<void> {
  const country = await getCountryFromDb(countryCode);
  const option = (country?.orderOptions ?? []).find((item) => item.id === optionId);
  if (!option) return;
  if (option.imageUrl?.trim()) return;

  const dishHint =
    option.signatureDish?.trim() || option.notes?.trim()?.slice(0, 160) || option.name;
  const discovered = await discoverItemImageQueries({
    kind: "recipe",
    countryName,
    title: option.signatureDish?.trim() || option.name,
    detail: dishHint,
  });
  const queries = [
    ...discovered.searchQueries,
    ...(option.signatureDish
      ? [
          `${option.signatureDish} dish`,
          `${option.signatureDish} ${countryName} food`,
          `${option.signatureDish} plate`,
        ]
      : []),
    `${option.name} food`,
    `${option.name} ${countryName} dish`,
    `${countryName} takeaway food`,
  ];
  const image = await findCuisineImageFromQueries(queries, {
    excludeUrls: [option.imageUrl],
  });
  if (!image) return;

  await updateOrderOption(countryCode, optionId, {
    imageUrl: image.url,
    imageAttribution: image.attribution,
  });
}
