/**
 * Background enrichment for newly added order options:
 * text (signature dish / notes) → image (Wikimedia).
 * Runs in-process (no external queue); jobs are fire-and-forget after admin add.
 */

import {
  appendOrderOptions,
  getCountryFromDb,
  removeOrderOption,
  updateOrderOption,
} from "../db/content.ts";
import {
  discoverItemImageQueries,
  isOpenAiConfigured,
  rewriteOrderOptionText,
} from "../openai/adminDiscover.ts";
import type { OrderOption } from "../../src/types/content.ts";
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

/** Wait until the in-process queue is empty (for CLI agents). */
export async function waitForOrderOptionEnrichmentIdle(
  pollMs = 250,
): Promise<void> {
  while (running || queue.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
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

  const textOutcome = await enrichText(countryCode, countryName, optionId).catch(
    (error) => {
      console.warn(`[order-enrich] text failed ${countryCode}/${optionId}`, error);
      return { removed: false as const, hostCode: countryCode, optionId };
    },
  );
  if (textOutcome.removed) {
    console.info(
      `[order-enrich] removed/reassigned ${countryCode}/${optionId}`,
    );
    return;
  }

  await enrichImage(textOutcome.hostCode, countryName, textOutcome.optionId).catch(
    (error) => {
      console.warn(
        `[order-enrich] image failed ${textOutcome.hostCode}/${textOutcome.optionId}`,
        error,
      );
    },
  );

  console.info(`[order-enrich] done ${countryCode}/${optionId}`);
}

function optionUrlKey(option: OrderOption): string {
  return (
    option.thuisbezorgdUrl ||
    option.ubereatsUrl ||
    option.url ||
    ""
  )
    .trim()
    .toLowerCase();
}

async function reassignOrderOption(
  hostCode: string,
  option: OrderOption,
  cuisineCodes: string[],
  patch: Partial<OrderOption>,
): Promise<void> {
  const merged: OrderOption = {
    ...option,
    ...patch,
    cuisineCodes,
  };
  await removeOrderOption(hostCode, option.id);

  for (const code of cuisineCodes) {
    const country = await getCountryFromDb(code);
    if (!country) continue;
    const existing = country.orderOptions ?? [];
    const urlKey = optionUrlKey(merged);
    const already = existing.some(
      (row) =>
        (urlKey && optionUrlKey(row) === urlKey) ||
        (row.platform === merged.platform &&
          row.name.trim().toLowerCase() === merged.name.trim().toLowerCase() &&
          (row.city ?? "").trim().toLowerCase() ===
            (merged.city ?? "").trim().toLowerCase()),
    );
    if (already) continue;
    await appendOrderOptions(code, [
      {
        ...merged,
        id: `${merged.id}-${code}`,
        cuisineCodes: [code],
      },
    ]);
  }
}

async function enrichText(
  countryCode: string,
  countryName: string,
  optionId: string,
): Promise<{ removed: boolean; hostCode: string; optionId: string }> {
  const country = await getCountryFromDb(countryCode);
  const option = (country?.orderOptions ?? []).find((item) => item.id === optionId);
  if (!option) return { removed: true, hostCode: countryCode, optionId };

  const rewritten = await rewriteOrderOptionText({
    countryName,
    countryCode,
    option,
  });

  if (rewritten.hadPageEvidence && rewritten.cuisineVerdict === "unclear") {
    await removeOrderOption(countryCode, optionId);
    return { removed: true, hostCode: countryCode, optionId };
  }

  if (
    rewritten.cuisineVerdict === "clear" &&
    rewritten.cuisineCodes.length > 0 &&
    !rewritten.cuisineCodes.includes(countryCode.toLowerCase())
  ) {
    await reassignOrderOption(
      countryCode,
      option,
      rewritten.cuisineCodes,
      rewritten.patch,
    );
    return { removed: true, hostCode: countryCode, optionId };
  }

  await updateOrderOption(countryCode, optionId, rewritten.patch);
  return { removed: false, hostCode: countryCode, optionId };
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
