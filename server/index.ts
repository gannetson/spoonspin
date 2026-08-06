import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { buildMapsSearchUrl } from "../src/restaurants/utils.ts";
import type {
  Restaurant,
  RestaurantSearchResult,
} from "../src/restaurants/types.ts";
import { haversineKm } from "../src/lib/haversine.ts";
import {
  searchLocalRestaurants,
  type StoredRestaurant,
} from "./db/restaurants.ts";
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
  countryCode: z.string().length(2).optional(),
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

  if (params.countryCode) {
    const local = searchLocalRestaurants({
      countryCode: params.countryCode,
      cityOrPostcode: params.cityOrPostcode,
      visitorLocation: params.visitorLocation,
      reviewedOnly: true,
      maxDistanceKm: 100,
      limit: 50,
    }).map((row) =>
      toApiRestaurant(row, params.visitorLocation, params.cityOrPostcode),
    );

    if (local.length > 0) {
      res.json({
        status: "ok",
        restaurants: local,
        source: "local",
        mapsSearchUrl,
      } satisfies RestaurantSearchResult);
      return;
    }
  }

  // Quality mode: do not fall back to Mapbox/Google POI search.
  // Those providers return the same unrelated Leiden junk for many cuisines.
  // Prefer an empty result + Maps link until curated coverage exists.
  const allowLiveFallback =
    process.env.RESTAURANT_LIVE_FALLBACK === "1" ||
    process.env.RESTAURANT_LIVE_FALLBACK === "true";

  if (!allowLiveFallback) {
    res.json({
      status: "ok",
      restaurants: [],
      source: "local",
      mapsSearchUrl,
      message: params.countryCode
        ? `No reviewed ${params.countryName} restaurants in our quality DB yet. Open Google Maps, or add places via npm run agent:curate.`
        : `No reviewed restaurants found. Open Google Maps below.`,
    } satisfies RestaurantSearchResult);
    return;
  }

  const provider = resolveProvider();

  if (!provider) {
    res.json({
      status: "unconfigured",
      restaurants: [],
      source: "fallback",
      mapsSearchUrl,
      message:
        "No local restaurants found and no live provider is configured. Run `npm run agent:restaurants`, or add MAPBOX_ACCESS_TOKEN / GOOGLE_PLACES_API_KEY, or open the Maps link below.",
    } satisfies RestaurantSearchResult);
    return;
  }

  const cacheKey = JSON.stringify({
    provider: provider.id,
    country: params.countryName,
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

function toApiRestaurant(
  row: StoredRestaurant,
  visitorLocation?: { lat: number; lng: number },
  cityOrPostcode?: string,
): Restaurant {
  const location =
    row.lat != null && row.lng != null
      ? { lat: row.lat, lng: row.lng }
      : undefined;

  const anchors: Record<string, { lat: number; lng: number }> = {
    leiden: { lat: 52.1601, lng: 4.497 },
    amsterdam: { lat: 52.3676, lng: 4.9041 },
    rotterdam: { lat: 51.9244, lng: 4.4777 },
    utrecht: { lat: 52.0907, lng: 5.1214 },
    "den haag": { lat: 52.0705, lng: 4.3007 },
    "the hague": { lat: 52.0705, lng: 4.3007 },
    delft: { lat: 52.0116, lng: 4.3571 },
    haarlem: { lat: 52.3874, lng: 4.6462 },
  };
  let anchor = visitorLocation;
  if (!anchor) {
    const key = cityOrPostcode?.trim().toLowerCase() ?? "leiden";
    anchor =
      Object.entries(anchors).find(([city]) => key.includes(city))?.[1] ??
      anchors.leiden;
  }

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    website: row.website ?? undefined,
    mapsUrl: row.mapsUrl,
    location,
    rating: row.userRating ?? undefined,
    reviewCount: row.reviewCount ?? undefined,
    ratings: row.ratings ?? undefined,
    distanceKm:
      anchor && location ? haversineKm(anchor, location) : undefined,
    authenticityRating: row.authenticityRating ?? undefined,
    authenticityNotes: row.authenticityNotes ?? undefined,
    reviewed: row.reviewed,
  };
}

function resolveProvider(): LiveRestaurantProvider | null {
  if (PROVIDER_PREF === "google") {
    return GOOGLE_API_KEY ? createGooglePlacesProvider(GOOGLE_API_KEY) : null;
  }
  if (PROVIDER_PREF === "mapbox") {
    return MAPBOX_TOKEN ? createMapboxProvider(MAPBOX_TOKEN) : null;
  }

  if (MAPBOX_TOKEN) return createMapboxProvider(MAPBOX_TOKEN);
  if (GOOGLE_API_KEY) return createGooglePlacesProvider(GOOGLE_API_KEY);
  return null;
}

const server = app.listen(PORT, () => {
  const provider = resolveProvider();
  console.log(`Spoon Spin API listening on http://localhost:${PORT}`);
  console.log("Local SQLite prefers reviewed restaurants with authenticity ratings.");
  if (!provider) {
    console.log(
      "No live restaurant provider configured — set MAPBOX_ACCESS_TOKEN or GOOGLE_PLACES_API_KEY for fallback.",
    );
  } else {
    console.log(`Live fallback provider: ${provider.id}`);
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
