export type Restaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  mapsUrl: string;
  location?: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
};

export type RestaurantSearchParams = {
  cuisineAliases: string[];
  countryName: string;
  cityOrPostcode?: string;
  visitorLocation?: {
    lat: number;
    lng: number;
  };
};

export type RestaurantSearchResult =
  | {
      status: "ok";
      restaurants: Restaurant[];
      source: "google" | "mapbox" | "fallback";
      mapsSearchUrl: string;
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
      source: "google" | "mapbox" | "fallback";
      mapsSearchUrl: string;
      message: string;
    };

export interface RestaurantProvider {
  search(params: RestaurantSearchParams): Promise<RestaurantSearchResult>;
}
