import {
  countContentRows,
  getCountryFromDb,
  listCountriesFromDb,
} from "../db/content.ts";
import { recordProductEvent } from "../db/analytics.ts";

export function registerContentRoutes(app: import("express").Express): void {
  app.get("/api/countries", async (_req, res) => {
    try {
      const countries = await listCountriesFromDb();
      if (countries.length === 0) {
        res.status(503).json({
          message:
            "Country content is not seeded yet. Run npm run db:import-content.",
          countries: [],
        });
        return;
      }
      res.json({ countries });
    } catch (error) {
      console.error("List countries failed", error);
      res.status(500).json({
        message: "Could not load countries.",
        countries: [],
      });
    }
  });

  app.get("/api/countries/:code", async (req, res) => {
    try {
      const code = String(req.params.code ?? "");
      const country = await getCountryFromDb(code);
      if (!country) {
        res.status(404).json({ message: "Country not found." });
        return;
      }
      recordProductEvent({
        eventType: "country_view",
        ip: req.ip,
        meta: { code: country.code },
      });
      res.json({ country });
    } catch (error) {
      console.error("Get country failed", error);
      res.status(500).json({ message: "Could not load country." });
    }
  });

  app.get("/api/content/status", async (_req, res) => {
    try {
      const totals = await countContentRows();
      res.json(totals);
    } catch (error) {
      res.status(500).json({
        countries: 0,
        recipes: 0,
        message: error instanceof Error ? error.message : "DB error",
      });
    }
  });
}
