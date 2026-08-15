/**
 * Background enrichment for newly added restaurants:
 * image → authenticity text → menu → guest scores.
 * Runs in-process (no external queue); jobs are fire-and-forget after admin add.
 */

import {
  getRestaurantById,
  updateRestaurantMenu,
  updateRestaurantNotes,
  updateRestaurantPhoto,
  updateRestaurantScoresAndAuthenticity,
} from "../db/restaurants.ts";
import {
  researchRestaurantMenu,
  researchRestaurantScores,
  rewriteRestaurantText,
} from "../openai/adminDiscover.ts";
import {
  fetchGoogleRestaurantPhoto,
  isGooglePlacesConfigured,
} from "./googlePlacesPhoto.ts";
import { findCuisineImageFromQueries } from "./wikimedia.ts";
import { fetchBestWebsiteRestaurantPhoto } from "./websiteImages.ts";

export type RestaurantEnrichmentJob = {
  restaurantId: string;
  countryCode: string;
  countryName: string;
};

const queue: RestaurantEnrichmentJob[] = [];
const queuedIds = new Set<string>();
let running = false;

export function scheduleRestaurantEnrichment(job: RestaurantEnrichmentJob): void {
  if (queuedIds.has(job.restaurantId)) return;
  queuedIds.add(job.restaurantId);
  queue.push(job);
  void drainQueue();
}

export function scheduleRestaurantEnrichments(jobs: RestaurantEnrichmentJob[]): number {
  let scheduled = 0;
  for (const job of jobs) {
    if (queuedIds.has(job.restaurantId)) continue;
    queuedIds.add(job.restaurantId);
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
        await enrichRestaurantFully(job);
      } catch (error) {
        console.error(`Restaurant enrichment failed for ${job.restaurantId}`, error);
      } finally {
        queuedIds.delete(job.restaurantId);
      }
    }
  } finally {
    running = false;
    if (queue.length > 0) void drainQueue();
  }
}

export async function enrichRestaurantFully(job: RestaurantEnrichmentJob): Promise<void> {
  const { restaurantId, countryCode, countryName } = job;
  console.info(`[enrich] start ${restaurantId} (${countryName})`);

  await enrichImage(restaurantId, countryName).catch((error) => {
    console.warn(`[enrich] image failed ${restaurantId}`, error);
  });
  await enrichText(restaurantId, countryName, countryCode).catch((error) => {
    console.warn(`[enrich] text failed ${restaurantId}`, error);
  });
  await enrichMenu(restaurantId, countryName, countryCode).catch((error) => {
    console.warn(`[enrich] menu failed ${restaurantId}`, error);
  });
  await enrichScores(restaurantId, countryName).catch((error) => {
    console.warn(`[enrich] scores failed ${restaurantId}`, error);
  });

  console.info(`[enrich] done ${restaurantId}`);
}

async function enrichImage(restaurantId: string, countryName: string): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return;
  if (restaurant.photoUrl) return;

  let image: {
    url: string;
    attribution: string;
  } | null = null;

  try {
    image = await fetchGoogleRestaurantPhoto({
      name: restaurant.name,
      city: restaurant.city,
      address: restaurant.address,
    });
  } catch (error) {
    console.warn(`[enrich] Google photo failed ${restaurantId}`, error);
  }

  if (!image && restaurant.website) {
    try {
      image = await fetchBestWebsiteRestaurantPhoto({
        website: restaurant.website,
        restaurantName: restaurant.name,
      });
    } catch (error) {
      console.warn(`[enrich] website photo failed ${restaurantId}`, error);
    }
  }

  if (!image) {
    if (!isGooglePlacesConfigured()) {
      console.warn(
        `[enrich] skip Wikimedia fallback — set GOOGLE_PLACES_API_KEY for ${restaurantId}`,
      );
    }
    const commons = await findCuisineImageFromQueries([
      `${restaurant.name} ${restaurant.city} restaurant`,
      `${restaurant.name} restaurant Netherlands`,
      `${restaurant.name} ${countryName} restaurant`,
    ]);
    if (commons) {
      image = { url: commons.url, attribution: commons.attribution };
    }
  }

  if (!image) return;
  await updateRestaurantPhoto(restaurantId, image.url, image.attribution);
}

async function enrichText(
  restaurantId: string,
  countryName: string,
  countryCode: string,
): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return;

  const rewritten = await rewriteRestaurantText({
    countryName,
    countryCode,
    existingCuisineCodes: restaurant.cuisineCodes,
    restaurant: {
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      website: restaurant.website,
      authenticityNotes: restaurant.authenticityNotes,
    },
  });
  await updateRestaurantNotes(restaurantId, rewritten.authenticityNotes, {
    cuisineCodes: rewritten.cuisineCodes,
  });
}

async function enrichMenu(
  restaurantId: string,
  countryName: string,
  countryCode: string,
): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return;
  if (restaurant.menu && restaurant.menu.length > 0) return;

  const researched = await researchRestaurantMenu({
    countryName,
    countryCode,
    knownCuisineCodes: restaurant.cuisineCodes.map((code) => code.toLowerCase()),
    restaurant: {
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      website: restaurant.website,
    },
  });
  await updateRestaurantMenu(restaurantId, researched.items, {
    cuisineCodes: researched.cuisineCodes,
  });
}

async function enrichScores(restaurantId: string, countryName: string): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return;

  const researched = await researchRestaurantScores({
    countryName,
    restaurant: {
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      website: restaurant.website,
      authenticityNotes: restaurant.authenticityNotes,
      authenticityRating: restaurant.authenticityRating,
    },
  });
  const ratings = Object.fromEntries(
    Object.entries(researched.ratings).filter(([, value]) => value != null),
  );
  await updateRestaurantScoresAndAuthenticity(restaurantId, {
    ratings,
    priceLevel: researched.priceLevel,
    authenticityRating: researched.authenticityRating,
    authenticityNotes: researched.authenticityNotes,
  });
}
