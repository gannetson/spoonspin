import type { TagEntityType, TagIntent, TagSummary, UserTag } from "./types";

export type { TagEntityType, TagIntent, TagSummary, UserTag };

async function readJson<T>(response: Response): Promise<T & { message?: string }> {
  return (await response.json()) as T & { message?: string };
}

export type ListTagsParams = {
  intent?: TagIntent;
  entityType?: TagEntityType;
  countryCode?: string;
  minRating?: number;
};

export async function fetchMyTags(
  params: ListTagsParams = {},
): Promise<UserTag[]> {
  const query = new URLSearchParams();
  if (params.intent) query.set("intent", params.intent);
  if (params.entityType) query.set("entity_type", params.entityType);
  if (params.countryCode) query.set("country_code", params.countryCode);
  if (params.minRating != null) query.set("min_rating", String(params.minRating));
  const suffix = query.toString() ? `?${query}` : "";
  const response = await fetch(`/api/me/tags${suffix}`, {
    credentials: "include",
  });
  const data = await readJson<{ tags?: UserTag[] }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load tags.");
  }
  return data.tags ?? [];
}

export async function fetchMyTagSummary(): Promise<TagSummary> {
  const response = await fetch("/api/me/tags/summary", {
    credentials: "include",
  });
  const data = await readJson<{ summary?: TagSummary }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load summary.");
  }
  if (!data.summary) throw new Error("Could not load summary.");
  return data.summary;
}

export async function upsertMyTag(input: {
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  intent: TagIntent;
  rating?: number | null;
  reviewText?: string | null;
}): Promise<UserTag> {
  const response = await fetch("/api/me/tags", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ tag?: UserTag }>(response);
  if (!response.ok || !data.tag) {
    throw new Error(data.message ?? "Could not save tag.");
  }
  return data.tag;
}

export async function deleteMyTag(id: string): Promise<void> {
  const response = await fetch(`/api/me/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data.message ?? "Could not delete tag.");
  }
}

export async function uploadTagPhotos(
  tagId: string,
  files: File[],
): Promise<UserTag> {
  const form = new FormData();
  for (const file of files) {
    form.append("photos", file);
  }
  const response = await fetch(
    `/api/me/tags/${encodeURIComponent(tagId)}/photos`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    },
  );
  const data = await readJson<{ tag?: UserTag }>(response);
  if (!response.ok || !data.tag) {
    throw new Error(data.message ?? "Could not upload photos.");
  }
  return data.tag;
}

export async function removeTagPhoto(
  tagId: string,
  url: string,
): Promise<UserTag> {
  const response = await fetch(
    `/api/me/tags/${encodeURIComponent(tagId)}/photos`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
  );
  const data = await readJson<{ tag?: UserTag }>(response);
  if (!response.ok || !data.tag) {
    throw new Error(data.message ?? "Could not remove photo.");
  }
  return data.tag;
}
