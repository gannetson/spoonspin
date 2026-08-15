import { z } from "zod";
import type { Express } from "express";
import {
  listContentFlags,
  updateContentFlagStatus,
  type ContentFlagStatus,
} from "../db/contentFlags.ts";
import { requireAdmin } from "./auth.ts";

const statusFilterSchema = z.enum(["open", "resolved", "dismissed", "all"]);
const statusUpdateSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
});

export function registerAdminFlagRoutes(app: Express): void {
  app.get("/api/admin/flags", requireAdmin, async (req, res) => {
    const raw = typeof req.query.status === "string" ? req.query.status : "open";
    const parsed = statusFilterSchema.safeParse(raw);
    const status = (parsed.success ? parsed.data : "open") as ContentFlagStatus | "all";

    try {
      const flags = await listContentFlags({ status });
      res.json({ flags });
    } catch (error) {
      console.error("[admin] list flags failed", error);
      res.status(500).json({ message: "Could not load flags." });
    }
  });

  app.patch("/api/admin/flags/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!id) {
      res.status(400).json({ message: "Flag id required." });
      return;
    }
    const parsed = statusUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid status." });
      return;
    }
    try {
      const flag = await updateContentFlagStatus(id, parsed.data.status);
      if (!flag) {
        res.status(404).json({ message: "Flag not found." });
        return;
      }
      res.json({ flag });
    } catch (error) {
      console.error("[admin] update flag failed", error);
      res.status(500).json({ message: "Could not update flag." });
    }
  });
}
