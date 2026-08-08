import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  getRecipeFromCountry,
  setRuntimeCountries,
} from "@/content/countries";
import { fetchCountries } from "@/content/client";
import {
  getRecentCountryCodes,
  pickRandomCountry,
  rememberCountryCode,
} from "@/lib/picker";
import type { Country, Drink, Recipe, SpecialtyShop } from "@/types/content";
import { CountryCard } from "@/components/CountryCard";
import { CountrySelect } from "@/components/CountrySelect";
import { CookMenu } from "@/components/CookMenu";
import { DineSearch } from "@/components/DineSearch";
import { HomeHero } from "@/components/HomeHero";
import { AdminCountryMenu } from "@/components/AdminCountryMenu";
import { RecipeView } from "@/components/RecipeView";
import { RestaurantView } from "@/components/RestaurantView";
import { ShareButton } from "@/components/ShareButton";
import { FlagSpinner, SpinSpoonButton } from "@/components/SpinSpoonButton";
import {
  fetchCommunityDrinks,
  fetchCommunityRecipes,
  fetchCommunityShops,
} from "@/suggestions/client";
import type { Restaurant } from "@/restaurants/types";
import { useT } from "@/i18n/LocaleContext";

export type AppMode = "choose" | "cook" | "dine";

const FALLBACK_DRINK: Drink = {
  name: "Water",
  type: "soft-drink",
  alcoholic: false,
  description: "Still or sparkling water — a safe pairing while you cook.",
};

function parseMode(value: string | null): AppMode {
  if (value === "cook" || value === "dine") return value;
  // Country pages default to Cook when no mode was chosen yet.
  return "cook";
}

function findCountry(
  countries: Country[],
  code: string | null,
): Country | undefined {
  if (!code) return undefined;
  return countries.find((country) => country.code === code.toLowerCase());
}

export default function App() {
  const t = useT();
  const { user, logout, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [published, setPublished] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const countryCode = searchParams.get("country")?.toLowerCase() ?? null;
  const mode = parseMode(searchParams.get("mode"));
  const recipeId = searchParams.get("recipe");
  const restaurantId = searchParams.get("restaurant");
  const [dineRestaurantCache, setDineRestaurantCache] =
    useState<Restaurant | null>(null);
  const [dineRefreshKey, setDineRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    setCountriesError(null);
    void fetchCountries()
      .then((countries) => {
        if (cancelled) return;
        setRuntimeCountries(countries);
        setPublished(countries);
        setCountriesLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCountriesError("Could not load countries from the server.");
        setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCountry = useMemo(
    () => findCountry(published, countryCode),
    [published, countryCode],
  );
  const invalidCountry =
    !countriesLoading && Boolean(countryCode) && !selectedCountry;

  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);
  const [communityDrinks, setCommunityDrinks] = useState<Drink[]>([]);
  const [communityShops, setCommunityShops] = useState<SpecialtyShop[]>([]);

  useEffect(() => {
    if (!selectedCountry) {
      setCommunityRecipes([]);
      setCommunityDrinks([]);
      setCommunityShops([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      fetchCommunityRecipes(selectedCountry.code),
      fetchCommunityDrinks(selectedCountry.code),
      fetchCommunityShops(selectedCountry.code),
    ]).then(([recipes, drinks, shops]) => {
      if (!cancelled) {
        setCommunityRecipes(recipes);
        setCommunityDrinks(drinks);
        setCommunityShops(shops);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  const selectedRecipe =
    selectedCountry && recipeId
      ? (getRecipeFromCountry(selectedCountry, recipeId) ??
        communityRecipes.find((recipe) => recipe.id === recipeId))
      : undefined;

  const [spinning, setSpinning] = useState(false);
  const [spinNames, setSpinNames] = useState<{ flag: string; name: string }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const spinTimer = useRef<number | null>(null);

  useEffect(() => {
    if (invalidCountry) {
      setFallbackNotice(
        t("app.fallback.unknownCountry", { code: countryCode ?? "" }),
      );
      setSearchParams({}, { replace: true });
    }
  }, [invalidCountry, countryCode, setSearchParams, t]);

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearInterval(spinTimer.current);
    };
  }, []);

  const updateParams = useCallback(
    (next: {
      country?: string;
      mode?: AppMode;
      recipe?: string | null;
      restaurant?: string | null;
    }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.country) params.set("country", next.country);
          if (next.mode === "choose") params.delete("mode");
          else if (next.mode) params.set("mode", next.mode);
          if (next.recipe === null) params.delete("recipe");
          else if (next.recipe) params.set("recipe", next.recipe);
          if (next.restaurant === null) params.delete("restaurant");
          else if (next.restaurant) params.set("restaurant", next.restaurant);
          return params;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const cookReadyCountries = useMemo(
    () => published.filter((country) => country.cookReady),
    [published],
  );

  const pickCountry = useCallback(() => {
    if (spinning) return;
    if (cookReadyCountries.length === 0) return;
    setFallbackNotice(null);
    setSpinning(true);
    setSearchParams(
      (prev) => {
        if (!prev.get("recipe") && !prev.get("restaurant")) return prev;
        const params = new URLSearchParams(prev);
        params.delete("recipe");
        params.delete("restaurant");
        return params;
      },
      { replace: true },
    );
    const pool = cookReadyCountries.map((c) => ({
      flag: c.flag,
      name: c.name,
    }));
    setSpinNames(pool);

    let tick = 0;
    spinTimer.current = window.setInterval(() => {
      tick += 1;
      setSpinNames((current) => {
        const rotated = [...current.slice(1), current[0]!];
        return rotated;
      });
      if (tick > 18) {
        if (spinTimer.current) window.clearInterval(spinTimer.current);
        const recent = getRecentCountryCodes();
        const picked = pickRandomCountry(cookReadyCountries, recent);
        rememberCountryCode(picked.code);
        setSpinning(false);
        setAnnouncement(t("app.announce.selected", { name: picked.name }));
        setSearchParams(
          (prev) => {
            const params = new URLSearchParams();
            params.set("country", picked.code);
            const keptMode = prev.get("mode");
            params.set(
              "mode",
              keptMode === "cook" || keptMode === "dine" ? keptMode : "cook",
            );
            return params;
          },
          { replace: false },
        );
      }
    }, 70);
  }, [cookReadyCountries, setSearchParams, spinning, t]);

  const selectCountry = useCallback(
    (code: string) => {
      if (spinning) return;
      const country = findCountry(published, code);
      if (!country) return;
      setFallbackNotice(null);
      rememberCountryCode(country.code);
      setAnnouncement(t("app.announce.selected", { name: country.name }));
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams();
          params.set("country", country.code);
          const keptMode = prev.get("mode");
          params.set(
            "mode",
            keptMode === "cook" || keptMode === "dine" ? keptMode : "cook",
          );
          return params;
        },
        { replace: false },
      );
    },
    [published, setSearchParams, spinning, t],
  );

  const handleCountryUpdated = useCallback((country: Country) => {
    setPublished((prev) => {
      const index = prev.findIndex((item) => item.code === country.code);
      if (index === -1) {
        const next = [...prev, country];
        setRuntimeCountries(next);
        return next;
      }
      const next = [...prev];
      next[index] = country;
      setRuntimeCountries(next);
      return next;
    });
  }, []);

  const openRecipe = (recipe: Recipe) => {
    updateParams({ mode: "cook", recipe: recipe.id, restaurant: null });
  };

  const closeRecipe = () => {
    updateParams({ mode: "cook", recipe: null });
  };

  const openRestaurant = (restaurant: Restaurant) => {
    setDineRestaurantCache(restaurant);
    updateParams({ mode: "dine", restaurant: restaurant.id, recipe: null });
  };

  const closeRestaurant = () => {
    updateParams({ mode: "dine", restaurant: null });
  };

  useEffect(() => {
    if (!restaurantId) setDineRestaurantCache(null);
  }, [restaurantId]);

  useEffect(() => {
    if (mode !== "dine" && restaurantId) {
      updateParams({ restaurant: null });
    }
  }, [mode, restaurantId, updateParams]);

  const showHome = !selectedCountry && !spinning && !countriesLoading;
  const showCompactHeader = !showHome;
  const switcherTone = showHome ? "dark" : "light";

  return (
    <div className="relative passport-grid min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cream focus:px-3 focus:py-2"
      >
        {t("app.skipToContent")}
      </a>

      <header
        className={`mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6 ${
          showHome ? "absolute inset-x-0 top-0 z-20" : "pb-2"
        }`}
      >
        {showCompactHeader ? (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: false })}
            className="text-left"
          >
            <p className="font-display text-3xl text-ink sm:text-4xl">
              {t("app.brand")}
            </p>
            <p className="text-sm text-ink-soft">{t("app.tagline")}</p>
          </button>
        ) : (
          <span className="sr-only">{t("app.brand")}</span>
        )}

        <div
          className={`ml-auto flex flex-wrap items-center gap-3 ${
            showHome ? "text-cream" : "text-ink"
          }`}
        >
          {!authLoading && user ? (
            <>
              <span className="max-w-[12rem] truncate text-sm opacity-90">
                {user.name || user.email}
              </span>
              {user.role === "admin" ? (
                <AdminCountryMenu
                  country={selectedCountry && !spinning ? selectedCountry : null}
                  onCountryUpdated={handleCountryUpdated}
                  onRestaurantsAdded={() =>
                    setDineRefreshKey((value) => value + 1)
                  }
                  tone={switcherTone}
                />
              ) : null}
              <button
                type="button"
                onClick={() => void logout()}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold underline-offset-2 hover:underline ${
                  showHome ? "text-cream" : "text-tomato"
                }`}
              >
                {t("app.signOut")}
              </button>
            </>
          ) : !authLoading ? (
            <Link
              to="/login"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold underline-offset-2 hover:underline ${
                showHome ? "text-cream" : "text-tomato"
              }`}
            >
              {t("app.signIn")}
            </Link>
          ) : null}
          {selectedCountry ? (
            <ShareButton
              title={t("app.share.title", { name: selectedCountry.name })}
              url={window.location.href}
            />
          ) : null}
        </div>
      </header>

      <main
        id="main"
        className={
          showHome ? "" : "mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6"
        }
      >
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {fallbackNotice ? (
          <p
            role="status"
            className="mb-4 rounded-lg border border-tomato/30 bg-cream px-4 py-3 text-ink"
          >
            {fallbackNotice}
          </p>
        ) : null}

        {countriesLoading ? (
          <p className="mx-auto max-w-5xl px-4 py-16 text-ink-soft sm:px-6">
            {t("app.countries.loading")}
          </p>
        ) : null}

        {countriesError && !countriesLoading ? (
          <p
            role="alert"
            className="mx-auto mb-4 max-w-5xl rounded-lg border border-tomato/30 bg-cream px-4 py-3 text-ink sm:px-6"
          >
            {countriesError}
          </p>
        ) : null}

        {spinning && !selectedCountry ? (
          <section
            aria-label={t("app.spin.ariaLabel")}
            className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-16 sm:items-start sm:px-6"
          >
            <SpinSpoonButton spinning onClick={pickCountry} size="lg" />
            <FlagSpinner current={spinNames[0]} />
          </section>
        ) : null}

        {showHome ? (
          <HomeHero
            countries={published}
            onPick={pickCountry}
            onSelectCountry={selectCountry}
          />
        ) : null}

        {selectedCountry ? (
          <section
            className="space-y-6"
            aria-label={t("app.result.ariaLabel", {
              name: selectedCountry.name,
            })}
            aria-busy={spinning}
          >
            <CountryCard
              country={selectedCountry}
              spinning={spinning}
              spinningCountry={spinNames[0]}
              onSpin={pickCountry}
            />

            <div className="flex flex-wrap items-end gap-4">
              <ModeButton
                active={mode === "cook"}
                onClick={() =>
                  updateParams({ mode: "cook", recipe: null, restaurant: null })
                }
                label={t("app.mode.cook")}
                description={
                  selectedCountry.cookReady
                    ? t("app.mode.cook.descriptionReady")
                    : t("app.mode.cook.descriptionSoon")
                }
              />
              <ModeButton
                active={mode === "dine"}
                onClick={() =>
                  updateParams({ mode: "dine", recipe: null, restaurant: null })
                }
                label={t("app.mode.dine")}
                description={t("app.mode.dine.description")}
              />
              <CountrySelect
                countries={published}
                value={selectedCountry.code}
                onSelect={selectCountry}
                id="result-country-select"
                label={t("app.countrySelect.labelResult")}
              />
            </div>

            {mode === "cook" && !selectedRecipe ? (
              <CookMenu
                country={selectedCountry}
                communityRecipes={communityRecipes}
                communityDrinks={communityDrinks}
                communityShops={communityShops}
                onCommunityRecipesChange={setCommunityRecipes}
                onCommunityDrinksChange={setCommunityDrinks}
                onCommunityShopsChange={setCommunityShops}
                onCountryUpdated={handleCountryUpdated}
                onOpenRecipe={openRecipe}
              />
            ) : null}

            {mode === "cook" && selectedRecipe ? (
              <RecipeView
                country={selectedCountry}
                recipe={selectedRecipe}
                communityRecipes={communityRecipes}
                onCommunityRecipesChange={setCommunityRecipes}
                onCountryUpdated={handleCountryUpdated}
                drink={
                  selectedCountry.menu?.drink ??
                  selectedCountry.nationalDrink ??
                  FALLBACK_DRINK
                }
                onBack={closeRecipe}
              />
            ) : null}

            {mode === "dine" && restaurantId ? (
              <RestaurantView
                country={selectedCountry}
                restaurantId={restaurantId}
                initialRestaurant={
                  dineRestaurantCache?.id === restaurantId
                    ? dineRestaurantCache
                    : null
                }
                onBack={closeRestaurant}
                onUpdated={(next) => setDineRestaurantCache(next)}
                onRemoved={() => setDineRestaurantCache(null)}
              />
            ) : null}

            {mode === "dine" && !restaurantId ? (
              <DineSearch
                country={selectedCountry}
                onOpenRestaurant={openRestaurant}
                refreshKey={dineRefreshKey}
              />
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`min-h-14 min-w-[9rem] flex-1 rounded-2xl px-5 py-3 text-left shadow-sm transition sm:flex-none ${
        active
          ? "bg-tomato text-cream"
          : "bg-cream text-ink ring-1 ring-ink/10 hover:ring-tomato/40"
      }`}
    >
      <span
        aria-hidden="true"
        className="block font-display text-2xl leading-none sm:text-3xl"
      >
        {label}
      </span>
      <span
        className={`mt-1 block text-sm ${active ? "text-cream/90" : "text-ink-soft"}`}
      >
        {description}
      </span>
    </button>
  );
}
