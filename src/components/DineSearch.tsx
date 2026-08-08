import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { Country } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { fetchRestaurants } from "@/restaurants/client";
import type { Restaurant } from "@/restaurants/types";
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
import { dineBannerUrl } from "@/content/countries/cuisineImages";
import { SuggestModal } from "@/components/SuggestModal";
import { RestaurantCard } from "@/components/RestaurantCard";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import {
  handleRestaurantAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useT } from "@/i18n/LocaleContext";

type DineSearchProps = {
  country: Country;
  onOpenRestaurant: (restaurant: Restaurant) => void;
  /** Bump to force a fresh search (e.g. after admin add). */
  refreshKey?: number;
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

const SORT_OPTION_VALUES: RestaurantSortMode[] = [
  "default",
  "authenticity",
  "rating",
];

const SORT_OPTION_KEYS: Record<RestaurantSortMode, string> = {
  default: "dine.sort.default",
  authenticity: "dine.sort.authenticity",
  rating: "dine.sort.rating",
};

const DEFAULT_CITY = "Leiden";

export function DineSearch({
  country,
  onOpenRestaurant,
  refreshKey = 0,
}: DineSearchProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
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
    t,
  });
  searchRef.current = {
    country,
    cityOrPostcode,
    visitorLocation,
    rememberCity,
    t,
  };

  const sortedRestaurants = useMemo(() => {
    if (state.status !== "ready") return [];
    return sortRestaurants(state.restaurants, sortMode);
  }, [state, sortMode]);

  const sortOptions = SORT_OPTION_VALUES.map((value) => ({
    value,
    label: t(SORT_OPTION_KEYS[value]),
  }));

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
          t("dine.empty.default", { name: country.name }),
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
      t: translate,
    } = searchRef.current;

    if (!city.trim()) return;
    if (refreshKey === 0 && !remember) return;

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
            translate("dine.empty.default", { name: activeCountry.name }),
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
  }, [country.code, refreshKey]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("dine.locationUnsupported"));
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
        setLocationError(t("dine.locationDenied"));
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
  const bannerUrl = dineBannerUrl(country);

  return (
    <section aria-labelledby="dine-heading" className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem]">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <div className="h-40 w-full sm:h-52">
            <MediaPlaceholder
              labelKey="media.placeholder.country"
              tone="dark"
            />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/20"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <h2
            id="dine-heading"
            className="font-display text-3xl text-cream sm:text-5xl"
          >
            {t("dine.heading")}
          </h2>
          <p className="mt-2 max-w-lg text-cream/85">
            {t("dine.subtitle", { name: country.name })}
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
          {t("dine.suggestRestaurant")}
        </button>
      </div>

      {!showLocationForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="inline-flex items-center gap-2 text-sm text-ink">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span>
              {t("dine.searchingNear", { location: cityOrPostcode })}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditingLocation(true)}
            className="min-h-10 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
          >
            {t("dine.changeLocation")}
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
                {t("dine.cityOrPostcode")}
              </label>
              <input
                id={inputId}
                name="location"
                value={cityOrPostcode}
                onChange={(event) => {
                  setCityOrPostcode(event.target.value);
                  setVisitorLocation(undefined);
                }}
                placeholder={t("dine.cityOrPostcode.placeholder")}
                className="mt-1 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-3 text-ink"
                autoComplete="address-level2"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato-deep"
            >
              {t("dine.searchRestaurants")}
            </button>
            <button
              type="button"
              onClick={useMyLocation}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 font-semibold text-ink hover:border-tomato hover:text-tomato"
            >
              <Navigation aria-hidden="true" className="size-4" />
              {t("dine.useMyLocation")}
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
            {t("dine.rememberCity")}
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
          {t("dine.searching")}
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
              {t("dine.retry")}
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
              {sortedRestaurants.length === 1
                ? t("dine.results.count", {
                    count: sortedRestaurants.length,
                    location: cityOrPostcode,
                  })
                : t("dine.results.countPlural", {
                    count: sortedRestaurants.length,
                    location: cityOrPostcode,
                  })}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor={sortId} className="text-sm font-semibold text-ink">
                {t("dine.sortBy")}
              </label>
              <select
                id={sortId}
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as RestaurantSortMode)
                }
                className="min-h-11 rounded-xl border border-ink/20 bg-white px-3 text-sm text-ink"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="grid gap-3">
            {sortedRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onOpen={() => onOpenRestaurant(restaurant)}
                isAdmin={isAdmin}
                adminBusy={Boolean(busy[`restaurant:${restaurant.id}`])}
                adminStatus={status[`restaurant:${restaurant.id}`]}
                adminError={error[`restaurant:${restaurant.id}`]}
                onAdminAction={(action) => {
                  void run(`restaurant:${restaurant.id}`, () =>
                    handleRestaurantAdminAction({
                      action,
                      countryName: country.name,
                      countryCode: country.code,
                      restaurant,
                      onUpdated: (next) => {
                        setState((prev) => {
                          if (prev.status !== "ready") return prev;
                          return {
                            ...prev,
                            restaurants: prev.restaurants.map((item) =>
                              item.id === next.id
                                ? {
                                    ...item,
                                    ...next,
                                    distanceKm: item.distanceKm,
                                  }
                                : item,
                            ),
                          };
                        });
                      },
                      onRemoved: (id) => {
                        setState((prev) => {
                          if (prev.status !== "ready") return prev;
                          return {
                            ...prev,
                            restaurants: prev.restaurants.filter(
                              (item) => item.id !== id,
                            ),
                          };
                        });
                      },
                    }),
                  );
                }}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "idle" && showLocationForm ? (
        <p className="text-sm text-ink-soft">
          {t("dine.idleHint")}
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
  const t = useT();
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
    >
      {t("dine.openGoogleMapsSearch")}
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  );
}
