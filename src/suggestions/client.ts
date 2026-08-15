import type { Drink, Recipe, SpecialtyShop } from "@/types/content";

export type SuggestionKind = "recipe" | "restaurant" | "drink" | "shop";

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

export type DrinkDraft = Omit<Drink, "id">;
export type ShopDraft = Omit<SpecialtyShop, "id">;

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

export type DrinkPreviewResponse = {
  found: boolean;
  confirmationNotes: string;
  drink: DrinkDraft | null;
};

export type ShopPreviewResponse = {
  found: boolean;
  confirmationNotes: string;
  shop: ShopDraft | null;
};

export type SuggestionPreviewResponse =
  | RecipePreviewResponse
  | RestaurantPreviewResponse
  | DrinkPreviewResponse
  | ShopPreviewResponse;

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

export type DrinkSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  drink: Drink;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type ShopSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  shop: SpecialtyShop;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AnySubmission =
  | ({ kind: "recipe" } & RecipeSubmission)
  | ({ kind: "restaurant" } & RestaurantSubmission)
  | ({ kind: "drink" } & DrinkSubmission)
  | ({ kind: "shop" } & ShopSubmission);

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
  placesConfigured: boolean;
}> {
  const response = await fetch("/api/suggestions/status");
  if (!response.ok) {
    return { openaiConfigured: false, placesConfigured: false };
  }
  const data = (await response.json()) as {
    openaiConfigured?: boolean;
    placesConfigured?: boolean;
  };
  return {
    openaiConfigured: Boolean(data.openaiConfigured),
    placesConfigured: Boolean(data.placesConfigured),
  };
}

export async function fetchCommunityRecipes(countryCode: string): Promise<Recipe[]> {
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

export async function fetchCommunityDrinks(countryCode: string): Promise<Drink[]> {
  try {
    const response = await fetch(
      `/api/suggestions/drinks?countryCode=${encodeURIComponent(countryCode)}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { drinks: Drink[] };
    return data.drinks ?? [];
  } catch {
    return [];
  }
}

export async function fetchCommunityShops(countryCode: string): Promise<SpecialtyShop[]> {
  try {
    const response = await fetch(
      `/api/suggestions/shops?countryCode=${encodeURIComponent(countryCode)}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { shops: SpecialtyShop[] };
    return data.shops ?? [];
  } catch {
    return [];
  }
}

export async function previewSuggestion(input: {
  kind: SuggestionKind;
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<SuggestionPreviewResponse> {
  const response = await fetch("/api/suggestions/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SuggestionPreviewResponse;
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
      }
    | {
        kind: "drink";
        countryCode: string;
        countryName: string;
        query: string;
        confirmationNotes?: string;
        drink: DrinkDraft;
      }
    | {
        kind: "shop";
        countryCode: string;
        countryName: string;
        query: string;
        confirmationNotes?: string;
        shop: ShopDraft;
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
    submission:
      RecipeSubmission | RestaurantSubmission | DrinkSubmission | ShopSubmission;
  };
  return { kind: data.kind, ...data.submission } as AnySubmission;
}

export async function fetchAdminSubmissions(input: {
  status?: SubmissionStatus | "all";
}): Promise<AnySubmission[]> {
  const params = new URLSearchParams({
    status: input.status ?? "pending",
  });
  const response = await fetch(`/api/admin/submissions?${params}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as { submissions: AnySubmission[] };
  return data.submissions;
}

export async function reviewSubmission(input: {
  id: string;
  kind: SuggestionKind;
  action: "approve" | "reject";
}): Promise<AnySubmission> {
  const response = await fetch(
    `/api/admin/submissions/${encodeURIComponent(input.id)}/${input.action}?kind=${input.kind}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind: input.kind }),
    },
  );
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as {
    kind: SuggestionKind;
    submission:
      RecipeSubmission | RestaurantSubmission | DrinkSubmission | ShopSubmission;
  };
  return { kind: data.kind, ...data.submission } as AnySubmission;
}
