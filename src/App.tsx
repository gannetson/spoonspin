import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getCountryByCode,
  getPublishedCountries,
  getRecipeFromCountry,
} from "@/content/countries";
import {
  getRecentCountryCodes,
  pickRandomCountry,
  rememberCountryCode,
} from "@/lib/picker";
import type { Drink, Recipe } from "@/types/content";
import { CountryCard } from "@/components/CountryCard";
import { CountrySelect } from "@/components/CountrySelect";
import { CookMenu } from "@/components/CookMenu";
import { DineSearch } from "@/components/DineSearch";
import { HomeHero } from "@/components/HomeHero";
import { RecipeView } from "@/components/RecipeView";
import { ShareButton } from "@/components/ShareButton";
import { FlagSpinner, SpinSpoonButton } from "@/components/SpinSpoonButton";
import { fetchCommunityRecipes } from "@/suggestions/client";

export type AppMode = "choose" | "cook" | "dine";

const FALLBACK_DRINK: Drink = {
  name: "Water",
  type: "soft-drink",
  alcoholic: false,
  description: "Still or sparkling water — a safe pairing while you cook.",
};

function parseMode(value: string | null): AppMode {
  if (value === "cook" || value === "dine") return value;
  return "choose";
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const published = useMemo(() => getPublishedCountries(), []);
  const countryCode = searchParams.get("country")?.toLowerCase() ?? null;
  const mode = parseMode(searchParams.get("mode"));
  const recipeId = searchParams.get("recipe");

  const selectedCountry = countryCode ? getCountryByCode(countryCode) : undefined;
  const invalidCountry = Boolean(countryCode) && !selectedCountry;

  const [communityRecipes, setCommunityRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (!selectedCountry) {
      setCommunityRecipes([]);
      return;
    }
    let cancelled = false;
    void fetchCommunityRecipes(selectedCountry.code).then((recipes) => {
      if (!cancelled) setCommunityRecipes(recipes);
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
        `We could not find a published country for “${countryCode}”. Pick again to continue.`,
      );
      setSearchParams({}, { replace: true });
    }
  }, [invalidCountry, countryCode, setSearchParams]);

  useEffect(() => {
    return () => {
      if (spinTimer.current) window.clearInterval(spinTimer.current);
    };
  }, []);

  const updateParams = useCallback(
    (next: { country?: string; mode?: AppMode; recipe?: string | null }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.country) params.set("country", next.country);
          if (next.mode === "choose") params.delete("mode");
          else if (next.mode) params.set("mode", next.mode);
          if (next.recipe === null) params.delete("recipe");
          else if (next.recipe) params.set("recipe", next.recipe);
          return params;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const pickCountry = useCallback(() => {
    if (spinning) return;
    setFallbackNotice(null);
    setSpinning(true);
    // Drop an open recipe, but keep cook/dine mode for the next country.
    setSearchParams(
      (prev) => {
        if (!prev.get("recipe")) return prev;
        const params = new URLSearchParams(prev);
        params.delete("recipe");
        return params;
      },
      { replace: true },
    );
    const pool = published.map((c) => ({ flag: c.flag, name: c.name }));
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
        const picked = pickRandomCountry(published, recent);
        rememberCountryCode(picked.code);
        setSpinning(false);
        setAnnouncement(`Selected ${picked.name}`);
        setSearchParams(
          (prev) => {
            const params = new URLSearchParams();
            params.set("country", picked.code);
            const keptMode = prev.get("mode");
            if (keptMode === "cook" || keptMode === "dine") {
              params.set("mode", keptMode);
            }
            return params;
          },
          { replace: false },
        );
      }
    }, 70);
  }, [published, setSearchParams, spinning]);

  const selectCountry = useCallback(
    (code: string) => {
      if (spinning) return;
      const country = getCountryByCode(code);
      if (!country) return;
      setFallbackNotice(null);
      rememberCountryCode(country.code);
      setAnnouncement(`Selected ${country.name}`);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams();
          params.set("country", country.code);
          const keptMode = prev.get("mode");
          if (keptMode === "cook" || keptMode === "dine") {
            params.set("mode", keptMode);
          }
          return params;
        },
        { replace: false },
      );
    },
    [setSearchParams, spinning],
  );

  const openRecipe = (recipe: Recipe) => {
    updateParams({ mode: "cook", recipe: recipe.id });
  };

  const closeRecipe = () => {
    updateParams({ mode: "cook", recipe: null });
  };

  const showHome = !selectedCountry && !spinning;
  const showCompactHeader = !showHome;

  return (
    <div className="relative passport-grid min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cream focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {showCompactHeader ? (
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pb-2 pt-6 sm:px-6">
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: false })}
            className="text-left"
          >
            <p className="font-display text-3xl text-ink sm:text-4xl">Spoon Spin</p>
            <p className="text-sm text-ink-soft">Food &amp; travel, by chance</p>
          </button>
          {selectedCountry ? (
            <ShareButton
              title={`Spoon Spin: ${selectedCountry.name}`}
              url={window.location.href}
            />
          ) : null}
        </header>
      ) : null}

      <main id="main" className={showHome ? "" : "mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6"}>
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

        {spinning && !selectedCountry ? (
          <section
            aria-label="Spinning for a country"
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
            aria-label={`${selectedCountry.name} result`}
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
                onClick={() => updateParams({ mode: "cook", recipe: null })}
                label="Cook"
                description={
                  selectedCountry.cookReady
                    ? "Cook a typical menu at home"
                    : "Recipes coming soon — overview available"
                }
              />
              <ModeButton
                active={mode === "dine"}
                onClick={() => updateParams({ mode: "dine", recipe: null })}
                label="Dine"
                description="Find restaurants in the Netherlands"
              />
              <CountrySelect
                countries={published}
                value={selectedCountry.code}
                onSelect={selectCountry}
                id="result-country-select"
                label="Or pick a country"
              />
            </div>

            {mode === "cook" && !selectedRecipe ? (
              <CookMenu
                country={selectedCountry}
                communityRecipes={communityRecipes}
                onCommunityRecipesChange={setCommunityRecipes}
                onOpenRecipe={openRecipe}
              />
            ) : null}

            {mode === "cook" && selectedRecipe ? (
              <RecipeView
                country={selectedCountry}
                recipe={selectedRecipe}
                drink={
                  selectedCountry.menu?.drink ??
                  selectedCountry.nationalDrink ??
                  FALLBACK_DRINK
                }
                onBack={closeRecipe}
              />
            ) : null}

            {mode === "dine" ? <DineSearch country={selectedCountry} /> : null}
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
      <span aria-hidden="true" className="block font-display text-2xl leading-none sm:text-3xl">
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
