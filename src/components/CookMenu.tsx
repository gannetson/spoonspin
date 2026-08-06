import { useMemo, useState } from "react";
import { Clock3, ExternalLink, Flame, MapPin, Store } from "lucide-react";
import type { Country, Recipe, RecipeCategory } from "@/types/content";
import {
  drinkMatchesAlcohol,
  getCountryDrinks,
  getCountryRecipes,
  getSpecialtyShops,
  recipeMatchesCategory,
  recipeMatchesDiet,
} from "@/content/countries/menuAccessors";

type CookMenuProps = {
  country: Country;
  onOpenRecipe: (recipe: Recipe) => void;
};

type CategoryFilter = "all" | RecipeCategory;
type DietFilter = "all" | "vegetarian" | "meat";
type AlcoholFilter = "all" | "alcoholic" | "non-alcoholic";

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All courses" },
  { value: "starter", label: "Starter" },
  { value: "main", label: "Main" },
  { value: "side", label: "Side" },
  { value: "dessert", label: "Dessert" },
  { value: "snack", label: "Snack" },
];

const DIET_FILTERS: Array<{ value: DietFilter; label: string }> = [
  { value: "all", label: "Any diet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "meat", label: "Meat" },
];

const ALCOHOL_FILTERS: Array<{ value: AlcoholFilter; label: string }> = [
  { value: "all", label: "All drinks" },
  { value: "alcoholic", label: "Alcoholic" },
  { value: "non-alcoholic", label: "Non-alcoholic" },
];

const COURSE_LABELS: Record<RecipeCategory, string> = {
  starter: "Starter",
  main: "Main course",
  side: "Side dish",
  dessert: "Dessert",
  snack: "Snack",
};

export function CookMenu({ country, onOpenRecipe }: CookMenuProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [alcoholFilter, setAlcoholFilter] = useState<AlcoholFilter>("all");

  const recipes = useMemo(() => getCountryRecipes(country), [country]);
  const drinks = useMemo(() => getCountryDrinks(country), [country]);
  const shops = useMemo(() => getSpecialtyShops(country), [country]);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipeMatchesCategory(recipe, categoryFilter) &&
          recipeMatchesDiet(recipe, dietFilter),
      ),
    [recipes, categoryFilter, dietFilter],
  );

  const filteredDrinks = useMemo(
    () => drinks.filter((drink) => drinkMatchesAlcohol(drink, alcoholFilter)),
    [drinks, alcoholFilter],
  );

  return (
    <section aria-labelledby="menu-heading" className="space-y-6">
      <div>
        <h2 id="menu-heading" className="font-display text-3xl text-ink">
          Tonight&apos;s menu
        </h2>
        <p className="mt-1 text-ink-soft">
          {recipes.length} recipes and {drinks.length} drinks from {country.name}.
          Filter and open any dish for the full recipe.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10">
        <p className="text-sm font-semibold text-ink">Filters</p>
        <FilterRow
          label="Course"
          options={CATEGORY_FILTERS}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterRow
          label="Diet"
          options={DIET_FILTERS}
          value={dietFilter}
          onChange={setDietFilter}
        />
      </div>

      <ul className="grid gap-3">
        {filteredRecipes.map((recipe) => {
          const isNational = recipe.id === country.nationalDishId;
          return (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => onOpenRecipe(recipe)}
                className={`flex w-full flex-col gap-2 rounded-2xl px-5 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                  isNational
                    ? "bg-ink text-cream shadow-lg shadow-ink/20 ring-2 ring-saffron"
                    : "bg-cream text-ink ring-1 ring-ink/10 hover:ring-tomato/40"
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      isNational ? "text-saffron-soft" : "text-stamp"
                    }`}
                  >
                    {COURSE_LABELS[recipe.category]}
                    {isNational ? " · iconic national dish" : ""}
                    {recipe.dietaryLabels.length > 0
                      ? ` · ${recipe.dietaryLabels.join(", ")}`
                      : ""}
                  </p>
                  <p className="mt-1 font-display text-2xl">{recipe.name}</p>
                  {recipe.localName ? (
                    <p
                      className={`text-sm ${isNational ? "text-cream/80" : "text-ink-soft"}`}
                    >
                      {recipe.localName}
                    </p>
                  ) : null}
                </div>
                <div
                  className={`flex gap-4 text-sm ${isNational ? "text-cream/80" : "text-ink-soft"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock3 aria-hidden="true" className="size-4" />
                    {recipe.prepMinutes + recipe.cookMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1 capitalize">
                    <Flame aria-hidden="true" className="size-4" />
                    {recipe.difficulty}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {filteredRecipes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stamp/40 bg-white/50 p-5 text-ink-soft">
          No recipes match these filters. Try another course or diet.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl text-ink">Drinks</h3>
            <p className="text-sm text-ink-soft">
              National drinks, beer, wine, and soft options.
            </p>
          </div>
          <FilterRow
            label="Drinks"
            options={ALCOHOL_FILTERS}
            value={alcoholFilter}
            onChange={setAlcoholFilter}
          />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {filteredDrinks.map((item) => (
            <li
              key={`${item.name}-${item.type}`}
              className="rounded-2xl border border-dashed border-stamp/40 bg-white/40 p-5"
            >
              <p className="font-semibold text-ink">
                {item.name}
                {item.localName ? (
                  <span className="font-normal text-ink-soft">
                    {" "}
                    · {item.localName}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {item.alcoholic ? "Alcoholic" : "Non-alcoholic"} · {item.type}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{item.description}</p>
            </li>
          ))}
        </ul>
        {filteredDrinks.length === 0 ? (
          <p className="text-sm text-ink-soft">No drinks match this filter.</p>
        ) : null}
      </div>

      {shops.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Specialty shops</h3>
            <p className="text-sm text-ink-soft">
              Netherlands shops that stock ingredients for {country.name} cooking.
            </p>
          </div>
          <ul className="grid gap-3">
            {shops.map((shop) => (
              <li
                key={shop.id}
                className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 font-display text-xl text-ink">
                      <Store aria-hidden="true" className="size-5" />
                      {shop.name}
                    </p>
                    <p className="mt-1 inline-flex items-start gap-2 text-sm text-ink-soft">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                      />
                      <span>
                        {shop.address}
                        {shop.city ? ` · ${shop.city}` : ""}
                      </span>
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {shop.specialty}
                    </p>
                    {shop.notes ? (
                      <p className="mt-1 text-sm text-ink-soft">{shop.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shop.website ? (
                      <a
                        href={shop.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                      >
                        Website
                        <ExternalLink aria-hidden="true" className="size-4" />
                      </a>
                    ) : null}
                    <a
                      href={shop.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                    >
                      Open in Maps
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">{label}</span>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-full px-3 text-sm font-semibold transition ${
              active
                ? "bg-ink text-cream"
                : "border border-ink/15 bg-white text-ink hover:border-tomato hover:text-tomato"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
