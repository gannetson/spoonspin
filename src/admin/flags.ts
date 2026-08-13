import type { TagEntityType } from "@/tags/types";

export type ContentFlagStatus = "open" | "resolved" | "dismissed";

export type AdminContentFlag = {
  id: string;
  userId: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  reason: string;
  status: ContentFlagStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporterEmail: string | null;
  reporterName: string | null;
};

async function readJson<T>(
  response: Response,
): Promise<T & { message?: string }> {
  return (await response.json()) as T & { message?: string };
}

export async function fetchAdminFlags(
  status: ContentFlagStatus | "all" = "open",
): Promise<AdminContentFlag[]> {
  const response = await fetch(
    `/api/admin/flags?status=${encodeURIComponent(status)}`,
    { credentials: "include" },
  );
  const data = await readJson<{ flags?: AdminContentFlag[] }>(response);
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load flags.");
  }
  return data.flags ?? [];
}

export async function updateAdminFlagStatus(
  id: string,
  status: ContentFlagStatus,
): Promise<AdminContentFlag> {
  const response = await fetch(`/api/admin/flags/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await readJson<{ flag?: AdminContentFlag }>(response);
  if (!response.ok || !data.flag) {
    throw new Error(data.message ?? "Could not update flag.");
  }
  return data.flag;
}

export function flagEntityHref(flag: AdminContentFlag): string {
  const country = encodeURIComponent(flag.countryCode);
  const id = encodeURIComponent(flag.entityId);
  if (flag.entityType === "restaurant") {
    return `/?country=${country}&mode=dine&restaurant=${id}`;
  }
  if (flag.entityType === "recipe") {
    return `/?country=${country}&mode=cook&recipe=${id}`;
  }
  if (flag.entityType === "shop") {
    return `/?country=${country}&mode=cook&shop=${id}`;
  }
  return `/?country=${country}&mode=cook`;
}
