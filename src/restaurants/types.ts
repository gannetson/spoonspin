import type { RestaurantRatings } from "./ratings";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  ratings?: RestaurantRatings;
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
};

export type RestaurantSearchParams = {
  cuisineAliases: string[];
  countryName: string;
  countryCode?: string;
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
