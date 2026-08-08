export type AdminCountryOverviewRow = {
  code: string;
  name: string;
  flag: string;
  region: string;
  status: "draft" | "published";
  cookReady: boolean;
  recipes: number;
  drinks: number;
  shops: number;
  restaurants: number;
};

export type AdminOverviewResponse = {
  countries: AdminCountryOverviewRow[];
  totals: {
    countries: number;
    recipes: number;
    drinks: number;
    shops: number;
    restaurants: number;
  };
};

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  const response = await fetch("/api/admin/overview", {
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "Overview API is unavailable. Restart the API server (npm run dev) and try again."
        : `Overview API returned ${response.status} instead of JSON.`,
    );
  }
  const data = (await response.json()) as AdminOverviewResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load admin overview.");
  }
  return data;
}
