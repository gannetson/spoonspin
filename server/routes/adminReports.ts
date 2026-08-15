import { z } from "zod";
import { getAdminReports, type ReportRange } from "../db/analytics.ts";
import { requireAdmin } from "./auth.ts";

const rangeSchema = z.enum(["24h", "7d", "30d"]);

export function registerAdminReportRoutes(app: import("express").Express): void {
  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    const raw = typeof req.query.range === "string" ? req.query.range : "7d";
    const parsed = rangeSchema.safeParse(raw);
    const range: ReportRange = parsed.success ? parsed.data : "7d";

    try {
      const reports = await getAdminReports(range);
      res.json(reports);
    } catch (error) {
      console.error("[admin] reports failed", error);
      res.status(500).json({ message: "Could not load reports." });
    }
  });
}
