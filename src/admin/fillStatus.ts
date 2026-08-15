export type FillOrderCellStatus = "done" | "pending" | "failed";

export type AdminFillStatusResponse = {
  progress: {
    version: number;
    orderCompletedIds: string[];
    orderFailedIds: string[];
    lastRunAt: string | null;
    lastOrdersRunAt: string | null;
    lastCookRunAt: string | null;
    lastRestaurantsRunAt: string | null;
    cookCompletedCodes: string[];
    cookFailedCodes: string[];
    gatherCompletedJobIds: string[];
    totals: {
      runs: number;
      orderOptionsAdded: number;
      orderJobsDone: number;
      restaurantsHarvested: number;
      restaurantsPromoted: number;
      cookMenusCompleted: number;
    };
  };
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

export async function fetchAdminFillStatus(): Promise<AdminFillStatusResponse> {
  const response = await fetch("/api/admin/fill-status", {
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "Fill status API is unavailable. Restart the API server and try again."
        : `Fill status API returned ${response.status} instead of JSON.`,
    );
  }
  const data = (await response.json()) as AdminFillStatusResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load fill status.");
  }
  return data;
}
