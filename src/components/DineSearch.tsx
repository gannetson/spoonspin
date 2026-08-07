import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Star,
} from "lucide-react";
import type { Country } from "@/types/content";
import { fetchRestaurants } from "@/restaurants/client";
import { formatDistanceKm } from "@/lib/haversine";
import type { Restaurant } from "@/restaurants/types";
import {
  listSourceRatings,
  normalizeToFive,
} from "@/restaurants/ratings";
import {
  sortRestaurants,
  type RestaurantSortMode,
} from "@/restaurants/sortRestaurants";
import {
  getRememberCityPreference,
  getSavedDineCity,
  getSavedDineCoords,
  saveDineLocation,
  setRememberCityPreference,
} from "@/restaurants/locationPreference";
import { restaurantImageFor } from "@/lib/images";
import { dineBannerUrl } from "@/content/countries/cuisineImages";
import { SuggestModal } from "@/components/SuggestModal";

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

const SORT_OPTIONS: Array<{ value: RestaurantSortMode; label: string }> = [
  { value: "default", label: "Best match (distance + ratings)" },
  { value: "authenticity", label: "Authenticity" },
  { value: "rating", label: "Guest rating (Google / Fork / TA)" },
];

const DEFAULT_CITY = "Leiden";

export function DineSearch({ country }: DineSearchProps) {
  const inputId = useId();
  const sortId = useId();
  const rememberId = useId();
  const savedCity = getSavedDineCity();
  const rememberPreferred = getRememberCityPreference();

  const [cityOrPostcode, setCityOrPostcode] = useState(
    savedCity ?? DEFAULT_CITY,
  );
  const [rememberCity, setRememberCity] = useState(rememberPreferred);
  const [editingLocation, setEditingLocation] = useState(
    !(rememberPreferred && Boolean(savedCity)),
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [visitorLocation, setVisitorLocation] = useState<
    { lat: number; lng: number } | undefined
  >(() => getSavedDineCoords());
  const [sortMode, setSortMode] = useState<RestaurantSortMode>("default");
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [suggestOpen, setSuggestOpen] = useState(false);

  const searchRef = useRef({
    country,
    cityOrPostcode,
    visitorLocation,
    rememberCity,
  });
  searchRef.current = {
    country,
    cityOrPostcode,
    visitorLocation,
    rememberCity,
  };

  const sortedRestaurants = useMemo(() => {
    if (state.status !== "ready") return [];
    return sortRestaurants(state.restaurants, sortMode);
  }, [state, sortMode]);

  async function runSearch(location = visitorLocation) {
    const city = cityOrPostcode.trim();
    setLocationError(null);
    setState({ status: "loading" });
    const result = await fetchRestaurants({
      cuisineAliases: country.cuisineAliases,
      countryName: country.name,
      countryCode: country.code,
      cityOrPostcode: city || undefined,
      visitorLocation: location,
    });

    if (rememberCity && city) {
      saveDineLocation(city, location);
      setEditingLocation(false);
    }

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
        message:
          result.message ??
          `No reviewed ${country.name} restaurants nearby yet. Open Google Maps, or try another city.`,
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

  useEffect(() => {
    const {
      country: activeCountry,
      cityOrPostcode: city,
      visitorLocation: coords,
      rememberCity: remember,
    } = searchRef.current;

    if (!remember || !city.trim()) return;

    let cancelled = false;

    async function autoSearch() {
      setLocationError(null);
      setState({ status: "loading" });
      const result = await fetchRestaurants({
        cuisineAliases: activeCountry.cuisineAliases,
        countryName: activeCountry.name,
        countryCode: activeCountry.code,
        cityOrPostcode: city.trim(),
        visitorLocation: coords,
      });
      if (cancelled) return;

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
          message:
            result.message ??
            `No reviewed ${activeCountry.name} restaurants nearby yet. Open Google Maps, or try another city.`,
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

    void autoSearch();
    return () => {
      cancelled = true;
    };
  }, [country.code]);

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

  function onRememberChange(next: boolean) {
    setRememberCity(next);
    setRememberCityPreference(next);
    if (next && cityOrPostcode.trim()) {
      saveDineLocation(cityOrPostcode, visitorLocation);
    }
  }

  const showLocationForm = editingLocation || !rememberCity;

  return (
    <section aria-labelledby="dine-heading" className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem]">
        <img
          src={dineBannerUrl(country)}
          alt=""
          className="h-40 w-full object-cover sm:h-52"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/20"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <h2
            id="dine-heading"
            className="font-display text-3xl text-cream sm:text-5xl"
          >
            Dine in the Netherlands
          </h2>
          <p className="mt-2 max-w-lg text-cream/85">
            Find reviewed {country.name} restaurants within about 100 km.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSuggestOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        >
          <Plus aria-hidden="true" className="size-4" />
          Suggest a restaurant
        </button>
      </div>

      {!showLocationForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="inline-flex items-center gap-2 text-sm text-ink">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span>
              Searching near <span className="font-semibold">{cityOrPostcode}</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditingLocation(true)}
            className="min-h-10 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
          >
            Change location
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor={inputId} className="text-sm font-semibold text-ink">
                City or postcode
              </label>
              <input
                id={inputId}
                name="location"
                value={cityOrPostcode}
                onChange={(event) => {
                  setCityOrPostcode(event.target.value);
                  setVisitorLocation(undefined);
                }}
                placeholder="e.g. Leiden or 2312"
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
          </div>
          <label
            htmlFor={rememberId}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"
          >
            <input
              id={rememberId}
              type="checkbox"
              checked={rememberCity}
              onChange={(event) => onRememberChange(event.target.checked)}
              className="size-4 rounded border-ink/30"
            />
            Remember city for other countries
          </label>
        </form>
      )}

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
        <div className="grid gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              {sortedRestaurants.length} reviewed place
              {sortedRestaurants.length === 1 ? "" : "s"} within 100 km of{" "}
              {cityOrPostcode}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor={sortId} className="text-sm font-semibold text-ink">
                Sort by
              </label>
              <select
                id={sortId}
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as RestaurantSortMode)
                }
                className="min-h-11 rounded-xl border border-ink/20 bg-white px-3 text-sm text-ink"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="grid gap-3">
            {sortedRestaurants.map((restaurant, index) => (
              <li
                key={restaurant.id}
                className="flex overflow-hidden rounded-2xl bg-cream ring-1 ring-ink/10"
              >
                <img
                  src={restaurant.photoUrl ?? restaurantImageFor(index)}
                  alt=""
                  className="hidden w-36 shrink-0 object-cover sm:block"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div>
                      <h3 className="font-display text-2xl text-ink">
                        {restaurant.name}
                      </h3>
                      <p className="mt-1 inline-flex items-start gap-2 text-sm text-ink-soft">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0"
                        />
                        <span>
                          {restaurant.address}
                          {restaurant.city ? ` · ${restaurant.city}` : ""}
                        </span>
                      </p>
                      {restaurant.distanceKm != null ? (
                        <p className="mt-2 text-base font-semibold text-ink">
                          {formatDistanceKm(restaurant.distanceKm)} away
                        </p>
                      ) : null}
                      {restaurant.authenticityNotes ? (
                        <p className="mt-2 max-w-xl text-sm text-ink-soft">
                          {restaurant.authenticityNotes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {restaurant.authenticityRating != null ? (
                        <p
                          className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-cream"
                          title="Editorial authenticity rating for this cuisine"
                        >
                          Authenticity {restaurant.authenticityRating.toFixed(0)}
                          /5
                        </p>
                      ) : null}
                      {restaurant.rating != null ? (
                        <p className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1 text-sm font-semibold">
                          <Star
                            aria-hidden="true"
                            className="size-4 text-saffron"
                          />
                          {restaurant.rating.toFixed(1)}
                          {restaurant.reviewCount != null
                            ? ` (${restaurant.reviewCount})`
                            : ""}
                        </p>
                      ) : null}
                      {listSourceRatings(restaurant.ratings).map((item) => (
                        <p
                          key={item.source}
                          className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-semibold text-ink"
                          title={`${item.label} guest rating`}
                        >
                          {item.label}{" "}
                          {item.rating.scale === 10
                            ? `${item.rating.score.toFixed(1)}/10`
                            : `${normalizeToFive(item.rating).toFixed(1)}/5`}
                          {item.rating.count != null
                            ? ` · ${item.rating.count}`
                            : ""}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 px-5 pb-5">
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "idle" && showLocationForm ? (
        <p className="text-sm text-ink-soft">
          Enter a city or postcode, or use your location to search.
        </p>
      ) : null}

      <SuggestModal
        kind="restaurant"
        country={country}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onAdded={() => {
          void runSearch();
        }}
      />
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
