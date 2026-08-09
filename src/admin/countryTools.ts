import type {
  Country,
  Drink,
  Recipe,
  RecipeCategory,
  SpecialtyShop,
} from "@/types/content";

export type DiscoveredRestaurant = {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  website?: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
  authenticityNotes?: string;
  authenticityRating?: number;
  phone?: string;
  verified?: boolean;
};

export type DishCandidate = {
  id: string;
  name: string;
  localName?: string;
  description: string;
  category: RecipeCategory;
};

async function readJson<T>(response: Response): Promise<T & { message?: string }> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.status === 401
        ? "Please sign in again."
        : response.status >= 500
          ? "Server error with an empty response. The API may have timed out — try again, or restart npm run dev / the API."
          : `Admin request failed (${response.status || "network error"}).`,
    );
  }
  try {
    return JSON.parse(text) as T & { message?: string };
  } catch {
    throw new Error(
      `Server returned invalid JSON (${response.status}). ${text.slice(0, 120)}`,
    );
  }
}

async function postAdmin<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await readJson<T>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Admin request failed.");
  }
  return data;
}

export function replaceCountryImage(code: string) {
  return postAdmin<{
    country: Country;
    imageUrl: string;
    imageAttribution?: string;
    dishName: string;
    notes: string;
  }>(`/api/admin/countries/${encodeURIComponent(code)}/replace-image`);
}

export async function updateCountryText(code: string, introduction: string) {
  const response = await fetch(
    `/api/admin/countries/${encodeURIComponent(code)}/text`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ introduction }),
    },
  );
  const data = await readJson<{ country: Country }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Could not update country text.");
  }
  return data;
}

export function discoverRecipes(code: string, query?: string) {
  return postAdmin<{ notes: string; recipes: DishCandidate[] }>(
    `/api/admin/countries/${encodeURIComponent(code)}/discover/recipes`,
    { query },
  );
}

export function addRecipes(code: string, recipes: Array<Recipe | DishCandidate>) {
  return postAdmin<{
    country: Country;
    added: number;
    enrichmentQueued?: number;
  }>(`/api/admin/countries/${encodeURIComponent(code)}/recipes`, {
    recipes,
  });
}

export function discoverRestaurants(code: string, query?: string) {
  return postAdmin<{ notes: string; restaurants: DiscoveredRestaurant[] }>(
    `/api/admin/countries/${encodeURIComponent(code)}/discover/restaurants`,
    { query },
  );
}

export function addRestaurants(code: string, restaurants: DiscoveredRestaurant[]) {
  return postAdmin<{
    added: number;
    countryCode: string;
    enrichmentQueued?: number;
  }>(`/api/admin/countries/${encodeURIComponent(code)}/restaurants`, {
    restaurants,
  });
}

export function discoverShops(code: string, query?: string) {
  return postAdmin<{ notes: string; shops: SpecialtyShop[] }>(
    `/api/admin/countries/${encodeURIComponent(code)}/discover/shops`,
    { query },
  );
}

export function addShops(code: string, shops: SpecialtyShop[]) {
  return postAdmin<{ country: Country; added: number }>(
    `/api/admin/countries/${encodeURIComponent(code)}/shops`,
    { shops },
  );
}

export function discoverDrinks(code: string, query?: string) {
  return postAdmin<{ notes: string; drinks: Drink[] }>(
    `/api/admin/countries/${encodeURIComponent(code)}/discover/drinks`,
    { query },
  );
}

export function addDrinks(code: string, drinks: Drink[]) {
  return postAdmin<{ country: Country; added: number }>(
    `/api/admin/countries/${encodeURIComponent(code)}/drinks`,
    { drinks },
  );
}

export function findDrinkImages(code: string) {
  return postAdmin<{
    country: Country;
    updated: number;
    skipped: number;
    missing: number;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/find-drink-images`,
  );
}

export function composeDinner(code: string) {
  return postAdmin<{
    country: Country;
    dinner: import("@/types/content").DinnerSuggestion;
    notes: string;
  }>(`/api/admin/countries/${encodeURIComponent(code)}/compose-dinner`);
}

async function deleteAdmin<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await readJson<T>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Admin request failed.");
  }
  return data;
}

export function removeRecipe(code: string, recipeId: string) {
  return deleteAdmin<{ country: Country | undefined; source: string }>(
    `/api/admin/countries/${encodeURIComponent(code)}/recipes/${encodeURIComponent(recipeId)}`,
  );
}

export function replaceRecipeImage(code: string, recipeId: string) {
  return postAdmin<{
    country: Country | undefined;
    recipe: Recipe | null;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/recipes/${encodeURIComponent(recipeId)}/replace-image`,
  );
}

export function replaceRecipeText(code: string, recipeId: string) {
  return postAdmin<{
    country: Country | undefined;
    recipe: Recipe | null;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/recipes/${encodeURIComponent(recipeId)}/replace-text`,
  );
}

export function selectRecipeForDinner(code: string, recipeId: string) {
  return postAdmin<{
    country: Country;
    dinner?: import("@/types/content").DinnerSuggestion;
    recipeId: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/recipes/${encodeURIComponent(recipeId)}/select-for-dinner`,
  );
}

export function removeDrink(code: string, drinkKey: string) {
  return deleteAdmin<{ country: Country | undefined }>(
    `/api/admin/countries/${encodeURIComponent(code)}/drinks/${encodeURIComponent(drinkKey)}`,
  );
}

export function replaceDrinkImage(code: string, drinkKey: string) {
  return postAdmin<{
    country: Country | undefined;
    drink: Drink;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/drinks/${encodeURIComponent(drinkKey)}/replace-image`,
  );
}

export function replaceDrinkText(code: string, drinkKey: string) {
  return postAdmin<{
    country: Country | undefined;
    drink: Drink;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/drinks/${encodeURIComponent(drinkKey)}/replace-text`,
  );
}

export function selectDrinkForDinner(code: string, drinkKey: string) {
  return postAdmin<{
    country: Country;
    dinner?: import("@/types/content").DinnerSuggestion;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/drinks/${encodeURIComponent(drinkKey)}/select-for-dinner`,
  );
}

export function removeDinnerCourse(code: string, recipeId: string) {
  return deleteAdmin<{
    country: Country;
    dinner?: import("@/types/content").DinnerSuggestion;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/dinner/courses/${encodeURIComponent(recipeId)}`,
  );
}

export function removeDinnerDrink(code: string, drinkName: string) {
  return deleteAdmin<{
    country: Country;
    dinner?: import("@/types/content").DinnerSuggestion;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/dinner/drinks/${encodeURIComponent(drinkName)}`,
  );
}

export function removeShop(code: string, shopId: string) {
  return deleteAdmin<{ country: Country | undefined }>(
    `/api/admin/countries/${encodeURIComponent(code)}/shops/${encodeURIComponent(shopId)}`,
  );
}

export function replaceShopText(code: string, shopId: string) {
  return postAdmin<{
    country: Country | undefined;
    shop: SpecialtyShop;
    notes: string;
  }>(
    `/api/admin/countries/${encodeURIComponent(code)}/shops/${encodeURIComponent(shopId)}/replace-text`,
  );
}

export function removeRestaurant(id: string) {
  return deleteAdmin<{ ok: true; id: string }>(
    `/api/admin/restaurants/${encodeURIComponent(id)}`,
  );
}

export function replaceRestaurantImage(id: string, countryName: string) {
  return postAdmin<{
    restaurant: import("@/restaurants/types").Restaurant;
    notes: string;
  }>(`/api/admin/restaurants/${encodeURIComponent(id)}/replace-image`, {
    countryName,
  });
}

export function replaceRestaurantText(
  id: string,
  countryName: string,
  countryCode?: string,
) {
  return postAdmin<{
    restaurant: import("@/restaurants/types").Restaurant;
    notes: string;
  }>(`/api/admin/restaurants/${encodeURIComponent(id)}/replace-text`, {
    countryName,
    countryCode,
  });
}

export function findRestaurantMenu(
  id: string,
  countryName: string,
  countryCode?: string,
) {
  return postAdmin<{
    restaurant: import("@/restaurants/types").Restaurant;
    notes: string;
    itemCount: number;
  }>(`/api/admin/restaurants/${encodeURIComponent(id)}/find-menu`, {
    countryName,
    countryCode,
  });
}

export function findRestaurantScores(id: string, countryName: string) {
  return postAdmin<{
    restaurant: import("@/restaurants/types").Restaurant;
    notes: string;
  }>(`/api/admin/restaurants/${encodeURIComponent(id)}/find-scores`, {
    countryName,
  });
}

export type AdminImageTarget =
  | { kind: "country"; countryCode: string }
  | { kind: "recipe"; countryCode: string; recipeId: string }
  | { kind: "drink"; countryCode: string; drinkKey: string }
  | { kind: "restaurant"; restaurantId: string };

export type AdminImageSearchResult = {
  url: string;
  attribution: string;
  title: string;
};

export async function searchAdminImages(input: {
  q: string;
  offset?: number;
  limit?: number;
}) {
  const params = new URLSearchParams({
    q: input.q,
    offset: String(input.offset ?? 0),
    limit: String(input.limit ?? 12),
  });
  const response = await fetch(`/api/admin/images/search?${params}`, {
    credentials: "include",
  });
  const data = await readJson<{
    results: AdminImageSearchResult[];
    nextOffset: number | null;
    totalHits: number | null;
    offset: number;
    limit: number;
  }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Image search failed.");
  }
  return data;
}

export function setAdminImage(input: {
  target: AdminImageTarget;
  imageUrl: string;
  imageAttribution?: string | null;
}) {
  return postAdmin<{
    country?: Country;
    recipe?: Recipe | null;
    drink?: Drink;
    restaurant?: import("@/restaurants/types").Restaurant;
    imageUrl: string;
    imageAttribution?: string | null;
  }>("/api/admin/images/set", input);
}

export async function uploadAdminImage(input: {
  target: AdminImageTarget;
  file: File;
  imageAttribution?: string;
}) {
  const form = new FormData();
  form.append("image", input.file);
  form.append("target", JSON.stringify(input.target));
  if (input.imageAttribution) {
    form.append("imageAttribution", input.imageAttribution);
  }
  const response = await fetch("/api/admin/images/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await readJson<{
    country?: Country;
    recipe?: Recipe | null;
    drink?: Drink;
    restaurant?: import("@/restaurants/types").Restaurant;
    imageUrl: string;
    imageAttribution?: string | null;
  }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Image upload failed.");
  }
  return data;
}
