import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { buildMapsSearchUrl } from "../src/restaurants/utils.ts";
import type { RestaurantSearchResult } from "../src/restaurants/types.ts";
import { createGooglePlacesProvider } from "./providers/googlePlaces.ts";
import { createMapboxProvider } from "./providers/mapbox.ts";
import type { LiveRestaurantProvider } from "./providers/types.ts";

const PORT = Number(process.env.API_PORT ?? 3001);
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY?.trim();
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN?.trim();
const PROVIDER_PREF = (process.env.RESTAURANT_PROVIDER ?? "auto").toLowerCase();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const searchBodySchema = z.object({
  cuisineAliases: z.array(z.string().min(1)).min(1),
  countryName: z.string().min(1),
  cityOrPostcode: z.string().optional(),
  visitorLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

type CacheEntry = {
  expiresAt: number;
  result: RestaurantSearchResult;
};

const cache = new Map<string, CacheEntry>();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: resolveProvider()?.id ?? null,
  });
});

app.post("/api/restaurants", async (req, res) => {
  const parsed = searchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      restaurants: [],
      source: "fallback",
      mapsSearchUrl: "https://www.google.com/maps",
      message: "Please enter a valid city or postcode.",
    } satisfies RestaurantSearchResult);
    return;
  }

  const params = parsed.data;
  const mapsSearchUrl = buildMapsSearchUrl(params);
  const provider = resolveProvider();

  if (!provider) {
    res.json({
      status: "unconfigured",
      restaurants: [],
      source: "fallback",
      mapsSearchUrl,
      message:
        "No restaurant provider is configured. Add MAPBOX_ACCESS_TOKEN (free tier) or GOOGLE_PLACES_API_KEY, or open the Maps link below.",
    } satisfies RestaurantSearchResult);
    return;
  }

  const cacheKey = JSON.stringify({
    provider: provider.id,
    aliases: params.cuisineAliases,
    city: params.cityOrPostcode?.trim().toLowerCase() ?? "",
  });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.result);
    return;
  }

  try {
    const restaurants = await provider.search(params);
    const result: RestaurantSearchResult = {
      status: "ok",
      restaurants,
      source: provider.id,
      mapsSearchUrl,
    };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    res.json(result);
  } catch (error) {
    console.error(`${provider.id} restaurant search failed`, error);
    res.status(502).json({
      status: "error",
      restaurants: [],
      source: provider.id,
      mapsSearchUrl,
      message: `We could not reach ${provider.id === "mapbox" ? "Mapbox" : "Google Places"} right now. Try again, or open Google Maps.`,
    } satisfies RestaurantSearchResult);
  }
});

function resolveProvider(): LiveRestaurantProvider | null {
  if (PROVIDER_PREF === "google") {
    return GOOGLE_API_KEY ? createGooglePlacesProvider(GOOGLE_API_KEY) : null;
  }
  if (PROVIDER_PREF === "mapbox") {
    return MAPBOX_TOKEN ? createMapboxProvider(MAPBOX_TOKEN) : null;
  }

  // auto: prefer Mapbox when available (generous free tier), else Google
  if (MAPBOX_TOKEN) return createMapboxProvider(MAPBOX_TOKEN);
  if (GOOGLE_API_KEY) return createGooglePlacesProvider(GOOGLE_API_KEY);
  return null;
}

const server = app.listen(PORT, () => {
  const provider = resolveProvider();
  console.log(`Spoon Spin API listening on http://localhost:${PORT}`);
  if (!provider) {
    console.log(
      "No restaurant provider configured — set MAPBOX_ACCESS_TOKEN or GOOGLE_PLACES_API_KEY.",
    );
  } else {
    console.log(`Restaurant provider: ${provider.id}`);
  }
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process (lsof -i :${PORT}) and retry.`,
    );
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
