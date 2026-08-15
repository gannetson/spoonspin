import { listCountriesFromDb } from "../db/content.ts";
import {
  loadFillProgress,
  type ContentFillProgressPayload,
} from "../db/fillProgress.ts";
import { countByCuisineCode, listRestaurants } from "../db/restaurants.ts";
import { FILL_CITIES } from "../../scripts/lib/fillCities.ts";
import { getCountryRecipes } from "../../src/content/countries/menuAccessors.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import type { Country } from "../../src/types/content.ts";

const RANDSTAD_HUB_COUNT = 5;
/** Reviewed restaurants below this for a cuisine → treat as a gather gap. */
const LOW_RESTAURANT_THRESHOLD = 3;
/** Cook library target (core menu + moreRecipes). */
const TARGET_RECIPES = 20;

export type FillOrderCellStatus = "done" | "pending" | "failed";

export type AdminFillStatusResponse = {
  progress: ContentFillProgressPayload;
  cities: string[];
  summary: {
    lastRunAt: string | null;
    lastOrdersRunAt: string | null;
    lastCookRunAt: string | null;
    lastRestaurantsRunAt: string | null;
    orderJobsDone: number;
    orderJobsTotal: number;
    orderJobsRemaining: number;
    orderJobsFailed: number;
    cookIncomplete: number;
    restaurantGaps: number;
    pendingRestaurantEnrichment: number;
    pendingOrderEnrichment: number;
  };
  orders: Array<{
    countryCode: string;
    countryName: string;
    city: string;
    jobId: string;
    status: FillOrderCellStatus;
    hasLiveOptions: boolean;
  }>;
  failedOrderJobs: string[];
  cookIncomplete: Array<{ code: string; name: string; recipeCount: number }>;
  restaurantGaps: Array<{
    code: string;
    name: string;
    reviewedCount: number;
  }>;
  gather: {
    completedJobIds: number;
    expectedJobs: number | null;
  };
  retryHint: string;
};

function cityNeedle(city: string): string {
  return city.toLowerCase().replace(/^the\s+/, "").trim();
}

function orderJobId(countryCode: string, city: string): string {
  return `${countryCode}:${cityNeedle(city).replace(/\s+/g, "-")}`;
}

function countryHasCityOrders(country: Country, city: string): boolean {
  const needle = cityNeedle(city);
  return (country.orderOptions ?? []).some((option) => {
    const optionCity = (option.city ?? "").toLowerCase();
    if (!optionCity) return false;
    if (needle === "den haag") {
      return (
        optionCity.includes("den haag") ||
        optionCity.includes("the hague") ||
        optionCity.includes("'s-gravenhage")
      );
    }
    return optionCity.includes(needle);
  });
}

function isWeakRestaurantNotes(notes: string | null | undefined): boolean {
  const text = (notes ?? "").trim();
  if (text.length < 40) return true;
  return /pending editorial|promoted from osm|solid starting point/i.test(text);
}

function needsOrderEnrichment(option: {
  notes?: string;
  signatureDish?: string;
  cuisineCodes?: string[];
}): boolean {
  const notes = (option.notes ?? "").trim();
  const dish = (option.signatureDish ?? "").trim();
  const codes = option.cuisineCodes ?? [];
  if (codes.length === 0) return true;
  if (!notes && !dish) return true;
  if (notes.length > 0 && notes.length < 24 && !dish) return true;
  return false;
}

export async function buildAdminFillStatus(): Promise<AdminFillStatusResponse> {
  const [progress, countries, cuisineCounts, restaurants] = await Promise.all([
    loadFillProgress(),
    listCountriesFromDb(),
    countByCuisineCode(),
    listRestaurants({ reviewedOnly: true }),
  ]);

  const cities = [...FILL_CITIES];
  const published = countries.filter((c) => c.status === "published");
  const done = new Set(progress.orderCompletedIds);
  const failed = new Set(progress.orderFailedIds);

  const orders: AdminFillStatusResponse["orders"] = [];
  for (const country of published) {
    for (const city of cities) {
      const jobId = orderJobId(country.code, city);
      const hasLiveOptions = countryHasCityOrders(country, city);
      let status: FillOrderCellStatus = "pending";
      if (failed.has(jobId) && !done.has(jobId) && !hasLiveOptions) {
        status = "failed";
      } else if (done.has(jobId) || hasLiveOptions) {
        status = "done";
      }
      orders.push({
        countryCode: country.code,
        countryName: country.name,
        city,
        jobId,
        status,
        hasLiveOptions,
      });
    }
  }

  const orderJobsTotal = orders.length;
  const orderJobsDone = orders.filter((row) => row.status === "done").length;
  const orderJobsFailed = orders.filter((row) => row.status === "failed").length;
  const orderJobsRemaining = orderJobsTotal - orderJobsDone;

  const cookIncomplete = published
    .filter((c) => !c.cookReady || getCountryRecipes(c).length < TARGET_RECIPES)
    .map((c) => ({
      code: c.code,
      name: c.name,
      recipeCount: getCountryRecipes(c).length,
    }));

  const restaurantGaps = published
    .map((c) => ({
      code: c.code,
      name: c.name,
      reviewedCount: cuisineCounts[c.code] ?? 0,
    }))
    .filter((row) => row.reviewedCount < LOW_RESTAURANT_THRESHOLD)
    .sort((a, b) => a.reviewedCount - b.reviewedCount || a.code.localeCompare(b.code));

  const osmCountries = published.filter(
    (c) => osmTagsForCountry(c.code).length > 0,
  ).length;
  const expectedJobs =
    osmCountries > 0 ? osmCountries * RANDSTAD_HUB_COUNT : null;

  let pendingRestaurantEnrichment = 0;
  for (const restaurant of restaurants) {
    if (
      restaurant.cuisineCodes.length === 0 ||
      isWeakRestaurantNotes(restaurant.authenticityNotes)
    ) {
      pendingRestaurantEnrichment += 1;
    }
  }

  let pendingOrderEnrichment = 0;
  for (const country of published) {
    for (const option of country.orderOptions ?? []) {
      if (needsOrderEnrichment(option)) pendingOrderEnrichment += 1;
    }
  }

  return {
    progress,
    cities,
    summary: {
      lastRunAt: progress.lastRunAt,
      lastOrdersRunAt: progress.lastOrdersRunAt,
      lastCookRunAt: progress.lastCookRunAt,
      lastRestaurantsRunAt: progress.lastRestaurantsRunAt,
      orderJobsDone,
      orderJobsTotal,
      orderJobsRemaining,
      orderJobsFailed,
      cookIncomplete: cookIncomplete.length,
      restaurantGaps: restaurantGaps.length,
      pendingRestaurantEnrichment,
      pendingOrderEnrichment,
    },
    orders,
    failedOrderJobs: progress.orderFailedIds,
    cookIncomplete,
    restaurantGaps,
    gather: {
      completedJobIds: progress.gatherCompletedJobIds.length,
      expectedJobs,
    },
    retryHint:
      "CLI: npm run agent:fill -- --lane orders --batch 3  ·  reset jobs: --reset-orders  ·  restaurants: --lane restaurants  ·  cook: --lane cook",
  };
}
