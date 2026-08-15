import type { TagEntityType } from "@/tags/types";

export type ContentFlag = {
  id: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
};

async function readJson<T>(response: Response): Promise<T & { message?: string }> {
  return (await response.json()) as T & { message?: string };
}

export async function submitContentFlag(input: {
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  reason: string;
}): Promise<ContentFlag> {
  const response = await fetch("/api/me/flags", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ flag?: ContentFlag }>(response);
  if (!response.ok || !data.flag) {
    throw new Error(data.message ?? "Could not submit report.");
  }
  return data.flag;
}
