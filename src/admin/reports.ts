export type ReportRange = "24h" | "7d" | "30d";

export type AdminReportsResponse = {
  range: ReportRange;
  totals: {
    requests: number;
    errors: number;
    uniqueIps: number;
    countryViews: number;
    restaurantSearches: number;
  };
  series: Array<{
    bucket: string;
    requests: number;
    errors: number;
  }>;
  topIps: Array<{ ip: string; count: number; lastSeen: string }>;
  topPaths: Array<{ path: string; count: number }>;
  statusBreakdown: {
    "2xx": number;
    "4xx": number;
    "5xx": number;
    other: number;
  };
  product: {
    totals: Record<string, number>;
    series: {
      country_view: Array<{ bucket: string; count: number }>;
      restaurant_search: Array<{ bucket: string; count: number }>;
    };
  };
};

export async function fetchAdminReports(
  range: ReportRange = "7d",
): Promise<AdminReportsResponse> {
  const response = await fetch(
    `/api/admin/reports?range=${encodeURIComponent(range)}`,
    { credentials: "include" },
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "Reports API is unavailable. Restart the API server (npm run dev) and try again."
        : `Reports API returned ${response.status} instead of JSON.`,
    );
  }
  const data = (await response.json()) as AdminReportsResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load reports.");
  }
  return data;
}
