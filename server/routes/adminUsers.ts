import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "./auth.ts";
import {
  USER_ROLES,
  getAdminUserById,
  listUsersForAdmin,
  updateUserRole,
} from "../db/users.ts";
import { getUserTagSummary, listUserTags } from "../db/userTags.ts";

const roleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export function registerAdminUserRoutes(app: import("express").Express): void {
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const users = await listUsersForAdmin();
      res.json({ users });
    } catch (error) {
      console.error("[admin] list users failed", error);
      res.status(500).json({ message: "Could not load users." });
    }
  });

  app.get("/api/admin/users/:id/profile", requireAdmin, async (req, res) => {
    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      res.status(400).json({ message: "Missing user id." });
      return;
    }
    try {
      const profileUser = await getAdminUserById(userId);
      if (!profileUser) {
        res.status(404).json({ message: "User not found." });
        return;
      }
      const [tags, summary] = await Promise.all([
        listUserTags(userId),
        getUserTagSummary(userId),
      ]);
      res.json({ user: profileUser, tags, summary });
    } catch (error) {
      console.error("[admin] user profile failed", error);
      res.status(500).json({ message: "Could not load user profile." });
    }
  });

  app.patch(
    "/api/admin/users/:id/role",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Choose a valid role." });
        return;
      }
      const userId = String(req.params.id ?? "").trim();
      if (!userId) {
        res.status(400).json({ message: "Missing user id." });
        return;
      }
      try {
        const user = await updateUserRole(userId, parsed.data.role, req.user!.id);
        res.json({ user });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update role.";
        const status =
          message === "User not found."
            ? 404
            : message === "Invalid role."
              ? 400
              : message.includes("admin")
                ? 400
                : 500;
        if (status === 500) {
          console.error("[admin] update user role failed", error);
        }
        res.status(status).json({ message });
      }
    },
  );
}
