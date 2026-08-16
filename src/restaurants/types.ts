import type { RestaurantRatings } from "./ratings";

/** Google-style price band; render as €–€€€€. */
export type PriceLevel = 1 | 2 | 3 | 4;

export type RestaurantMenuItemCategory =
  "starter" | "main" | "side" | "dessert" | "snack" | "drink";

export type RestaurantMenuItem = {
  id: string;
  name: string;
  localName?: string;
  description?: string;
  category?: RestaurantMenuItemCategory;
  priceEur?: number;
  /** ISO country codes whose flags should appear on this dish (set by Find menu). */
  cuisineCodes?: string[];
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  cuisineCodes: string[];
  rating?: number;
  reviewCount?: number;
  ratings?: RestaurantRatings;
  priceLevel?: PriceLevel;
  menu?: RestaurantMenuItem[];
  website?: string;
  mapsUrl: string;
  photoUrl?: string;
  photoAttribution?: string;
  location?: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  authenticityRating?: number;
  authenticityNotes?: string;
  reviewed?: boolean;
  regionId?: string;
};

export type RestaurantSearchParams = {
  cuisineAliases: string[];
  countryName: string;
  countryCode?: string;
  regionId?: string;
  cityOrPostcode?: string;
  visitorLocation?: {
    lat: number;
    lng: number;
  };
};

export type RestaurantSource = "local" | "google" | "mapbox" | "fallback";

export type RestaurantSearchResult =
  | {
      status: "ok";
      restaurants: Restaurant[];
      source: RestaurantSource;
      mapsSearchUrl: string;
      message?: string;
    }
  | {
      status: "unconfigured";
      restaurants: Restaurant[];
      source: "fallback";
      mapsSearchUrl: string;
      message: string;
    }
  | {
      status: "error";
      restaurants: Restaurant[];
      source: RestaurantSource;
      mapsSearchUrl: string;
      message: string;
    };

export interface RestaurantProvider {
  search(params: RestaurantSearchParams): Promise<RestaurantSearchResult>;
}
