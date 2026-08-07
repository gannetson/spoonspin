import type { Recipe } from "@/types/content";

export type SuggestionKind = "recipe" | "restaurant";

export type RestaurantDraft = {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  website?: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
  authenticityNotes?: string;
  phone?: string;
};

export type RecipePreviewResponse = {
  found: boolean;
  confirmationNotes: string;
  recipe: Omit<Recipe, "id"> | null;
};

export type RestaurantPreviewResponse = {
  found: boolean;
  confirmationNotes: string;
  restaurant: RestaurantDraft | null;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type RecipeSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  recipe: Recipe;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type RestaurantSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  restaurant: RestaurantDraft;
  restaurantRowId: string | null;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AnySubmission =
  | ({ kind: "recipe" } & RecipeSubmission)
  | ({ kind: "restaurant" } & RestaurantSubmission);

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    if (data.message) return data.message;
  } catch {
    /* ignore */
  }
  return `Request failed (${response.status})`;
}

export async function fetchSuggestionStatus(): Promise<{
  openaiConfigured: boolean;
}> {
  const response = await fetch("/api/suggestions/status");
  if (!response.ok) return { openaiConfigured: false };
  return (await response.json()) as { openaiConfigured: boolean };
}

export async function fetchCommunityRecipes(
  countryCode: string,
): Promise<Recipe[]> {
  try {
    const response = await fetch(
      `/api/suggestions/recipes?countryCode=${encodeURIComponent(countryCode)}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { recipes: Recipe[] };
    return data.recipes ?? [];
  } catch {
    return [];
  }
}

export async function previewSuggestion(input: {
  kind: SuggestionKind;
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<RecipePreviewResponse | RestaurantPreviewResponse> {
  const response = await fetch("/api/suggestions/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as
    | RecipePreviewResponse
    | RestaurantPreviewResponse;
}

export async function confirmSuggestion(
  body:
    | {
        kind: "recipe";
        countryCode: string;
        countryName: string;
        query: string;
        confirmationNotes?: string;
        recipe: Omit<Recipe, "id">;
      }
    | {
        kind: "restaurant";
        countryCode: string;
        countryName: string;
        query: string;
        confirmationNotes?: string;
        restaurant: RestaurantDraft;
      },
): Promise<AnySubmission> {
  const response = await fetch("/api/suggestions/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as {
    kind: SuggestionKind;
    submission: RecipeSubmission | RestaurantSubmission;
  };
  return { kind: data.kind, ...data.submission } as AnySubmission;
}

export async function fetchAdminSubmissions(input: {
  token: string;
  status?: SubmissionStatus | "all";
}): Promise<AnySubmission[]> {
  const params = new URLSearchParams({
    token: input.token,
    status: input.status ?? "pending",
  });
  const response = await fetch(`/api/admin/submissions?${params}`);
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { submissions: AnySubmission[] };
  return data.submissions;
}

export async function reviewSubmission(input: {
  token: string;
  id: string;
  kind: SuggestionKind;
  action: "approve" | "reject";
}): Promise<AnySubmission> {
  const response = await fetch(
    `/api/admin/submissions/${encodeURIComponent(input.id)}/${input.action}?kind=${input.kind}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": input.token,
      },
      body: JSON.stringify({ kind: input.kind }),
    },
  );
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as {
    kind: SuggestionKind;
    submission: RecipeSubmission | RestaurantSubmission;
  };
  return { kind: data.kind, ...data.submission } as AnySubmission;
}
