import { useId, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  RotateCcw,
  Star,
} from "lucide-react";
import type { Country } from "@/types/content";
import { fetchRestaurants } from "@/restaurants/client";
import { formatDistanceKm } from "@/lib/haversine";
import type { Restaurant } from "@/restaurants/types";

type DineSearchProps = {
  country: Country;
};

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      restaurants: Restaurant[];
      mapsSearchUrl: string;
      source: string;
      notice?: string;
    }
  | {
      status: "empty";
      mapsSearchUrl: string;
      message: string;
    }
  | {
      status: "error";
      mapsSearchUrl: string;
      message: string;
    };

export function DineSearch({ country }: DineSearchProps) {
  const inputId = useId();
  const [cityOrPostcode, setCityOrPostcode] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [visitorLocation, setVisitorLocation] = useState<
    { lat: number; lng: number } | undefined
  >();
  const [state, setState] = useState<ViewState>({ status: "idle" });

  async function runSearch(location = visitorLocation) {
    setLocationError(null);
    setState({ status: "loading" });
    const result = await fetchRestaurants({
      cuisineAliases: country.cuisineAliases,
      countryName: country.name,
      cityOrPostcode: cityOrPostcode.trim() || undefined,
      visitorLocation: location,
    });

    if (result.status === "error") {
      setState({
        status: "error",
        mapsSearchUrl: result.mapsSearchUrl,
        message: result.message,
      });
      return;
    }

    if (result.status === "unconfigured") {
      setState({
        status: "empty",
        mapsSearchUrl: result.mapsSearchUrl,
        message: result.message,
      });
      return;
    }

    if (result.restaurants.length === 0) {
      setState({
        status: "empty",
        mapsSearchUrl: result.mapsSearchUrl,
        message: `No ${country.name} restaurants found nearby. Try another city, or open Google Maps.`,
      });
      return;
    }

    setState({
      status: "ready",
      restaurants: result.restaurants,
      mapsSearchUrl: result.mapsSearchUrl,
      source: result.source,
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setVisitorLocation(next);
        void runSearch(next);
      },
      () => {
        setLocationError(
          "We could not access your location. You can still search by city or postcode.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <section aria-labelledby="dine-heading" className="space-y-5">
      <div>
        <h2 id="dine-heading" className="font-display text-3xl text-ink">
          Dine in the Netherlands
        </h2>
        <p className="mt-1 text-ink-soft">
          Find places serving {country.name} food near you.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch();
        }}
      >
        <div className="flex-1">
          <label htmlFor={inputId} className="text-sm font-semibold text-ink">
            City or postcode
          </label>
          <input
            id={inputId}
            name="location"
            value={cityOrPostcode}
            onChange={(event) => setCityOrPostcode(event.target.value)}
            placeholder="e.g. Amsterdam or 1012"
            className="mt-1 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-3 text-ink"
            autoComplete="address-level2"
          />
        </div>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato-deep"
        >
          Search restaurants
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 font-semibold text-ink hover:border-tomato hover:text-tomato"
        >
          <Navigation aria-hidden="true" className="size-4" />
          Use my location
        </button>
      </form>

      {locationError ? (
        <p role="alert" className="text-sm text-tomato">
          {locationError}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="inline-flex items-center gap-2 text-ink-soft" role="status">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          Searching restaurants…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-2xl border border-tomato/30 bg-cream p-5" role="alert">
          <p className="font-semibold text-ink">{state.message}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runSearch()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Retry
            </button>
            <MapsLink href={state.mapsSearchUrl} />
          </div>
        </div>
      ) : null}

      {state.status === "empty" ? (
        <div className="rounded-2xl border border-dashed border-stamp/40 bg-white/50 p-5">
          <p className="text-ink">{state.message}</p>
          <div className="mt-3">
            <MapsLink href={state.mapsSearchUrl} />
          </div>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <ul className="grid gap-3">
          {state.restaurants.map((restaurant) => (
            <li
              key={restaurant.id}
              className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-ink">{restaurant.name}</h3>
                  <p className="mt-1 inline-flex items-start gap-2 text-sm text-ink-soft">
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {restaurant.address}
                      {restaurant.city ? ` · ${restaurant.city}` : ""}
                    </span>
                  </p>
                </div>
                {restaurant.rating != null ? (
                  <p className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1 text-sm font-semibold">
                    <Star aria-hidden="true" className="size-4 text-saffron" />
                    {restaurant.rating.toFixed(1)}
                    {restaurant.reviewCount != null ? ` (${restaurant.reviewCount})` : ""}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {restaurant.distanceKm != null ? (
                  <span className="rounded-full bg-parchment px-3 py-1 text-sm font-semibold text-ink">
                    {formatDistanceKm(restaurant.distanceKm)} away
                  </span>
                ) : null}
                {restaurant.website ? (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                  >
                    Website
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
                <a
                  href={restaurant.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                >
                  Open in Google Maps
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {state.status === "idle" ? (
        <p className="text-sm text-ink-soft">
          Enter a city or postcode, or use your location to search.
        </p>
      ) : null}
    </section>
  );
}

function MapsLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
    >
      Open Google Maps search
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  );
}
