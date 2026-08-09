import type { UserRole } from "@/auth/AuthContext";

export function isEditorOrAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "editor";
}
