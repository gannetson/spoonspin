import type { UserRole } from "@/auth/AuthContext";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
};

export async function fetchAdminUsers(): Promise<AdminUsersResponse> {
  const response = await fetch("/api/admin/users", {
    credentials: "include",
  });
  const data = (await response.json()) as AdminUsersResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message ?? "Could not load users.");
  }
  return data;
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUserRow> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const data = (await response.json()) as {
    user?: AdminUserRow;
    message?: string;
  };
  if (!response.ok || !data.user) {
    throw new Error(data.message ?? "Could not update role.");
  }
  return data.user;
}

export type AdminUserProfileResponse = {
  user: AdminUserRow;
  tags: import("@/tags/types").UserTag[];
  summary: import("@/tags/types").TagSummary;
};

export async function fetchAdminUserProfile(
  userId: string,
): Promise<AdminUserProfileResponse> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/profile`, {
    credentials: "include",
  });
  const data = (await response.json()) as AdminUserProfileResponse & {
    message?: string;
  };
  if (!response.ok || !data.user || !data.tags || !data.summary) {
    throw new Error(data.message ?? "Could not load user profile.");
  }
  return {
    user: data.user,
    tags: data.tags,
    summary: data.summary,
  };
}
