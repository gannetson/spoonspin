import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Home,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  Utensils,
} from "lucide-react";
import type { Country, OrderPlatform } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { useConsent } from "@/consent/ConsentContext";
import { fetchRestaurants } from "@/restaurants/client";
import { getOrderOptions } from "@/content/countries/menuAccessors";
import { deliveryPlatformLinks, resolveOrderOptionHref } from "@/restaurants/deliveryLinks";
import { platformLogoSrc } from "@/restaurants/platformLogos";
import type { Restaurant } from "@/restaurants/types";
import {
  sortRestaurants,
  type RestaurantSortMode,
} from "@/restaurants/sortRestaurants";
import {
  DEFAULT_DINE_CITY,
  getRememberCityPreference,
  getSavedDineCity,
  getSavedDineCoords,
  saveDineLocation,
  setRememberCityPreference,
} from "@/restaurants/locationPreference";
import { dineBannerUrl } from "@/content/countries/cuisineImages";
import { SuggestModal } from "@/components/SuggestModal";
import { RestaurantCard } from "@/components/RestaurantCard";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { AdminDineMenu } from "@/components/AdminDineMenu";
import { DineLocationControl } from "@/components/DineLocationControl";
import {
  SuggestedItemReview,
  reviewTargetFromSuggestion,
  type SuggestReviewTarget,
} from "@/components/SuggestedItemReview";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import {
  handleOrderOptionAdminAction,
  handleRestaurantAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type DineSearchProps = {
  country: Country;
  onOpenRestaurant: (restaurant: Restaurant) => void;
  /** Bump to force a fresh search (e.g. after admin add). */
  refreshKey?: number;
  onCountryUpdated?: (country: Country) => void;
  onRestaurantsAdded?: () => void;
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

type DineTab = "out" | "home";

const DINE_TABS: DineTab[] = ["out", "home"];

export function DineSearch({
  country,
  onOpenRestaurant,
  refreshKey = 0,
  onCountryUpdated,
  onRestaurantsAdded,
}: DineSearchProps) {
  const t = useT();
  const { marketingAllowed } = useConsent();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const { openSelectImage } = useSelectImage();
  const sortId = useId();
  const savedCity = getSavedDineCity();
  const rememberPreferred = getRememberCityPreference();

  const [tab, setTab] = useState<DineTab>("out");
  const [cityOrPostcode, setCityOrPostcode] = useState(
    savedCity ?? DEFAULT_DINE_CITY,
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
  const [reviewTarget, setReviewTarget] = useState<SuggestReviewTarget | null>(
    null,
  );

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
        if (tab === "out") {
          void runSearch(next);
        } else {
          const city = cityOrPostcode.trim();
          if (rememberCity && city) {
            saveDineLocation(city, next);
            setEditingLocation(false);
          }
        }
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

  function onCityChange(next: string) {
    setCityOrPostcode(next);
    setVisitorLocation(undefined);
  }

  function confirmHomeLocation() {
    const city = cityOrPostcode.trim();
    setLocationError(null);
    if (!city) {
      setLocationError(t("dine.locationRequired"));
      return;
    }
    if (rememberCity) {
      saveDineLocation(city, visitorLocation);
    }
    setEditingLocation(false);
  }

  const showLocationForm = editingLocation || !rememberCity;
  const bannerUrl = dineBannerUrl(country);
  const orderOptions = useMemo(() => getOrderOptions(country), [country]);
  const filteredOrderOptions = useMemo(() => {
    const needle = cityOrPostcode.trim().toLowerCase();
    if (!needle || /^\d{4}/.test(needle)) return orderOptions;
    const matched = orderOptions.filter((option) =>
      option.city?.toLowerCase().includes(needle),
    );
    return matched.length > 0 ? matched : orderOptions;
  }, [orderOptions, cityOrPostcode]);
  const orderLinks = useMemo(
    () =>
      deliveryPlatformLinks({
        countryCode: country.code,
        countryName: country.name,
        cityOrPostcode,
        marketingAllowed,
      }),
    [country.code, country.name, cityOrPostcode, marketingAllowed],
  );

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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="dine-heading"
                className="font-display text-3xl text-ochre sm:text-5xl"
              >
                {t("dine.heading")}
              </h2>
              <p className="mt-2 max-w-lg text-cream/85">
                {t(
                  tab === "home" ? "dine.subtitle.home" : "dine.subtitle.out",
                  { name: country.name },
                )}
              </p>
            </div>
            {isAdmin && onCountryUpdated && onRestaurantsAdded ? (
              <AdminDineMenu
                country={country}
                cityOrPostcode={cityOrPostcode}
                onCountryUpdated={onCountryUpdated}
                onRestaurantsAdded={onRestaurantsAdded}
                tone="dark"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t("dine.tabs.label")}
        className="flex flex-wrap gap-2 rounded-2xl bg-cream p-2 ring-1 ring-ink/10"
      >
        {DINE_TABS.map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-burgundy text-cream"
                  : "text-burgundy hover:bg-burgundy/5"
              }`}
            >
              {value === "out" ? (
                <Utensils aria-hidden="true" className="size-4" />
              ) : (
                <Home aria-hidden="true" className="size-4" />
              )}
              {t(`dine.tabs.${value}`)}
            </button>
          );
        })}
      </div>

      {tab === "out" ? (
        <div role="tabpanel" className="space-y-5">
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

          <DineLocationControl
            cityOrPostcode={cityOrPostcode}
            onCityChange={onCityChange}
            rememberCity={rememberCity}
            onRememberChange={onRememberChange}
            showForm={showLocationForm}
            onEdit={() => setEditingLocation(true)}
            onSubmit={() => {
              void runSearch();
            }}
            onUseMyLocation={useMyLocation}
            locationError={locationError}
            summaryKey="dine.searchingNear"
            submitKey="dine.searchRestaurants"
          />

          {state.status === "loading" ? (
            <p
              className="inline-flex items-center gap-2 text-ink-soft"
              role="status"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
              {t("dine.searching")}
            </p>
          ) : null}

          {state.status === "error" ? (
            <div
              className="rounded-2xl border border-tomato/30 bg-cream p-5"
              role="alert"
            >
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
                  <label
                    htmlFor={sortId}
                    className="text-sm font-semibold text-ink"
                  >
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
                    countryCode={country.code}
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
                          openSelectImage,
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
            <p className="text-sm text-ink-soft">{t("dine.idleHint")}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "home" ? (
        <div role="tabpanel" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
            >
              <Plus aria-hidden="true" className="size-4" />
              {t("dine.suggestOrder")}
            </button>
          </div>

          <DineLocationControl
            cityOrPostcode={cityOrPostcode}
            onCityChange={onCityChange}
            rememberCity={rememberCity}
            onRememberChange={onRememberChange}
            showForm={showLocationForm}
            onEdit={() => setEditingLocation(true)}
            onSubmit={confirmHomeLocation}
            onUseMyLocation={useMyLocation}
            locationError={locationError}
            summaryKey="dine.orderingNear"
            submitKey="dine.setLocation"
          />

          <div className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10 sm:p-6">
            <h3 className="font-display text-2xl text-burgundy">
              {t("dine.order.heading")}
            </h3>
            <p className="mt-2 max-w-2xl text-ink-soft">
              {t("dine.order.subtitle", { name: country.name })}
            </p>
            <p className="mt-3 text-sm text-ink-soft">{t("dine.order.note")}</p>
          </div>

          {filteredOrderOptions.length > 0 ? (
            <ul className="grid gap-3">
              {filteredOrderOptions.map((option) => (
                <li
                  key={option.id}
                  className="relative overflow-hidden rounded-2xl bg-cream ring-1 ring-ink/10"
                >
                  {isAdmin && onCountryUpdated ? (
                    <AdminItemMenu
                      className="absolute right-3 top-3 z-10"
                      label={option.name}
                      busy={Boolean(busy[`order:${option.id}`])}
                      status={status[`order:${option.id}`]}
                      error={error[`order:${option.id}`]}
                      onAction={(action) => {
                        void run(`order:${option.id}`, () =>
                          handleOrderOptionAdminAction({
                            action,
                            country,
                            option,
                            onCountryUpdated,
                            openSelectImage,
                          }),
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch ${
                      isAdmin && onCountryUpdated ? "pr-12" : ""
                    }`}
                  >
                    <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-40">
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MediaPlaceholder
                          labelKey="media.placeholder.recipe"
                          className="h-full min-h-36"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
                          <img
                            src={platformLogoSrc(
                              option.platform as OrderPlatform,
                            )}
                            alt=""
                            className="size-5 rounded-md object-cover"
                          />
                          {t(`dine.order.platform.${option.platform}`)}
                        </p>
                        <p className="mt-1 font-display text-xl text-burgundy">
                          {option.name}
                        </p>
                        {option.signatureDish ? (
                          <p className="mt-1 text-sm font-semibold text-tomato">
                            {t("dine.order.signatureDish", {
                              dish: option.signatureDish,
                            })}
                          </p>
                        ) : null}
                        {option.city ? (
                          <p className="mt-1 inline-flex items-start gap-2 text-sm text-ink-soft">
                            <MapPin
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0"
                            />
                            {option.city}
                          </p>
                        ) : null}
                        {option.notes ? (
                          <p className="mt-2 text-sm text-ink-soft">
                            {option.notes}
                          </p>
                        ) : null}
                      </div>
                      <a
                        href={resolveOrderOptionHref({
                          platform: option.platform,
                          url: option.url,
                          countryCode: country.code,
                          countryName: country.name,
                          cityOrPostcode: option.city || cityOrPostcode,
                          marketingAllowed,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                      >
                        {t("dine.order.open")}
                        <ExternalLink aria-hidden="true" className="size-4" />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-stamp/40 bg-white/50 p-5">
              <p className="text-ink">
                {t("dine.order.empty", { name: country.name })}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-stamp">
              {t("dine.order.browsePlatforms")}
            </h4>
            <ul className="grid gap-3 sm:grid-cols-2">
              {orderLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-ink/10 bg-cream p-4 transition hover:border-tomato/40"
                  >
                    <div>
                      <p className="inline-flex items-center gap-2 font-display text-xl text-burgundy">
                        <img
                          src={platformLogoSrc(link.id)}
                          alt=""
                          className="size-8 rounded-lg object-cover"
                        />
                        {t(`dine.order.${link.id}.title`)}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {t(`dine.order.${link.id}.hint`, {
                          name: country.name,
                          query: link.searchLabel,
                        })}
                      </p>
                    </div>
                    <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-ink/15 px-3 text-sm font-semibold text-ink">
                      {t(`dine.order.${link.id}.cta`)}
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <SuggestModal
        kind="restaurant"
        country={country}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onAdded={(result) => {
          void runSearch();
          if (result.kind === "restaurant") {
            setReviewTarget(
              reviewTargetFromSuggestion({
                kind: "restaurant",
                countryCode: country.code,
                restaurant: result.restaurant,
              }),
            );
          }
        }}
      />
      <SuggestedItemReview
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
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
