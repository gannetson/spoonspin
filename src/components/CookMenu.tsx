import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Plus, Store } from "lucide-react";
import type { Country, Drink, Recipe, RecipeCategory } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import {
  drinkMatchesAlcohol,
  getCountryDrinks,
  getCountryRecipes,
  getSpecialtyShops,
  groupDrinksIntoSections,
  recipeMatchesCategory,
  recipeMatchesDiet,
} from "@/content/countries/menuAccessors";
import { cookBannerUrl } from "@/content/countries/cuisineImages";
import { SuggestModal } from "@/components/SuggestModal";
import { RecipeCard } from "@/components/RecipeCard";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import {
  handleRecipeAdminAction,
  handleShopAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useT } from "@/i18n/LocaleContext";

type CookMenuProps = {
  country: Country;
  communityRecipes: Recipe[];
  onCommunityRecipesChange: (recipes: Recipe[]) => void;
  onCountryUpdated: (country: Country) => void;
  onOpenRecipe: (recipe: Recipe) => void;
};

type CategoryFilter = "all" | RecipeCategory;
type DietFilter = "all" | "vegan" | "vegetarian" | "meat";
type AlcoholFilter =
  | "all"
  | "other-alcoholic"
  | "non-alcoholic"
  | "beer"
  | "wine";

const CATEGORY_FILTER_VALUES: CategoryFilter[] = [
  "all",
  "starter",
  "main",
  "side",
  "dessert",
  "snack",
];

const DIET_FILTER_VALUES: DietFilter[] = [
  "all",
  "vegan",
  "vegetarian",
  "meat",
];

const ALCOHOL_FILTER_VALUES: AlcoholFilter[] = [
  "all",
  "non-alcoholic",
  "beer",
  "wine",
  "other-alcoholic",
];

const CATEGORY_FILTER_KEYS: Record<CategoryFilter, string> = {
  all: "cook.filter.course.all",
  starter: "cook.filter.course.starter",
  main: "cook.filter.course.main",
  side: "cook.filter.course.side",
  dessert: "cook.filter.course.dessert",
  snack: "cook.filter.course.snack",
};

const DIET_FILTER_KEYS: Record<DietFilter, string> = {
  all: "cook.filter.diet.all",
  vegan: "cook.filter.diet.vegan",
  vegetarian: "cook.filter.diet.vegetarian",
  meat: "cook.filter.diet.meat",
};

const ALCOHOL_FILTER_KEYS: Record<AlcoholFilter, string> = {
  all: "cook.filter.alcohol.all",
  beer: "cook.filter.alcohol.beer",
  wine: "cook.filter.alcohol.wine",
  "other-alcoholic": "cook.filter.alcohol.otherAlcoholic",
  "non-alcoholic": "cook.filter.alcohol.nonAlcoholic",
};

export function CookMenu({
  country,
  communityRecipes,
  onCommunityRecipesChange,
  onCountryUpdated,
  onOpenRecipe,
}: CookMenuProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [alcoholFilter, setAlcoholFilter] = useState<AlcoholFilter>("all");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const authoredRecipes = useMemo(() => getCountryRecipes(country), [country]);
  const recipes = useMemo(() => {
    const seen = new Set(authoredRecipes.map((recipe) => recipe.id));
    return [
      ...authoredRecipes,
      ...communityRecipes.filter((recipe) => !seen.has(recipe.id)),
    ];
  }, [authoredRecipes, communityRecipes]);
  const drinks = useMemo(() => getCountryDrinks(country), [country]);
  const shops = useMemo(() => getSpecialtyShops(country), [country]);
  const communityIds = useMemo(
    () => new Set(communityRecipes.map((recipe) => recipe.id)),
    [communityRecipes],
  );
  const bannerUrl = cookBannerUrl(country);

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
  const drinkSections = useMemo(
    () =>
      groupDrinksIntoSections(filteredDrinks).filter(
        (section) => section.drinks.length > 0,
      ),
    [filteredDrinks],
  );

  const categoryFilters = CATEGORY_FILTER_VALUES.map((value) => ({
    value,
    label: t(CATEGORY_FILTER_KEYS[value]),
  }));
  const dietFilters = DIET_FILTER_VALUES.map((value) => ({
    value,
    label: t(DIET_FILTER_KEYS[value]),
  }));
  const alcoholFilters = ALCOHOL_FILTER_VALUES.map((value) => ({
    value,
    label: t(ALCOHOL_FILTER_KEYS[value]),
  }));

  const suggestButton = (
    <button
      type="button"
      onClick={() => setSuggestOpen(true)}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
    >
      <Plus aria-hidden="true" className="size-4" />
      {t("cook.suggestRecipe")}
    </button>
  );

  if (!country.cookReady || !country.menu) {
    return (
      <section
        aria-labelledby="menu-heading"
        className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream"
      >
        <div className="relative h-40 sm:h-48">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <MediaPlaceholder
              labelKey="media.placeholder.country"
              tone="dark"
              className="absolute inset-0"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/70 to-ink/10"
          />
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="menu-heading" className="font-display text-3xl text-ink sm:text-4xl">
              {t("cook.menu.heading")}
            </h2>
            {suggestButton}
          </div>
          <p className="max-w-2xl text-ink-soft">
            {authoredRecipes.length > 0 ? (
              t("cook.incomplete.withRecipes", { name: country.name })
            ) : (
              <>
                {t("cook.incomplete.noRecipesPrefix", { name: country.name })}
                {country.wikipedia ? t("cook.incomplete.wikipediaClause") : ""}
                {t("cook.incomplete.orSwitch")}
                <span className="font-semibold text-ink">{t("app.mode.dine")}</span>
                {t("cook.incomplete.dineSuffix")}
              </>
            )}
          </p>
          {authoredRecipes.length > 0 ? (
            <ul className="grid gap-3 pt-2">
              {authoredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  variant="simple"
                  showMeta={false}
                  onOpen={() => onOpenRecipe(recipe)}
                  isAdmin={isAdmin}
                  adminBusy={Boolean(busy[`recipe:${recipe.id}`])}
                  adminStatus={status[`recipe:${recipe.id}`]}
                  adminError={error[`recipe:${recipe.id}`]}
                  onAdminAction={(action) => {
                    void run(`recipe:${recipe.id}`, () =>
                      handleRecipeAdminAction({
                        action,
                        country,
                        recipe,
                        communityRecipes,
                        onCountryUpdated,
                        onCommunityRecipesChange,
                      }),
                    );
                  }}
                />
              ))}
            </ul>
          ) : null}
          {communityRecipes.length > 0 ? (
            <ul className="grid gap-3 pt-2">
              {communityRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  variant="community"
                  showMeta={false}
                  onOpen={() => onOpenRecipe(recipe)}
                  isAdmin={isAdmin}
                  adminBusy={Boolean(busy[`recipe:${recipe.id}`])}
                  adminStatus={status[`recipe:${recipe.id}`]}
                  adminError={error[`recipe:${recipe.id}`]}
                  onAdminAction={(action) => {
                    void run(`recipe:${recipe.id}`, () =>
                      handleRecipeAdminAction({
                        action,
                        country,
                        recipe,
                        communityRecipes,
                        onCountryUpdated,
                        onCommunityRecipesChange,
                      }),
                    );
                  }}
                />
              ))}
            </ul>
          ) : null}
        </div>
        <SuggestModal
          kind="recipe"
          country={country}
          open={suggestOpen}
          onClose={() => setSuggestOpen(false)}
          onAdded={(result) => {
            if (result.kind === "recipe") {
              onCommunityRecipesChange([result.recipe, ...communityRecipes]);
            }
          }}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="menu-heading" className="space-y-6">
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
            id="menu-heading"
            className="font-display text-3xl text-cream sm:text-5xl"
          >
            {t("cook.menu.heading")}
          </h2>
          <p className="mt-2 max-w-lg text-cream/85">
            {t("cook.banner.summary", {
              recipeCount: recipes.length,
              drinkCount: drinks.length,
              name: country.name,
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {suggestButton}
      </div>

      <div className="space-y-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10">
        <p className="text-sm font-semibold text-ink">{t("cook.filters")}</p>
        <FilterRow
          label={t("cook.filter.course")}
          options={categoryFilters}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterRow
          label={t("cook.filter.diet")}
          options={dietFilters}
          value={dietFilter}
          onChange={setDietFilter}
        />
      </div>

      <ul className="grid gap-3">
        {filteredRecipes.map((recipe) => {
          const isNational = recipe.id === country.nationalDishId;
          const isCommunity = communityIds.has(recipe.id);
          return (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              variant={
                isNational ? "national" : isCommunity ? "community" : "default"
              }
              onOpen={() => onOpenRecipe(recipe)}
              isAdmin={isAdmin}
              adminBusy={Boolean(busy[`recipe:${recipe.id}`])}
              adminStatus={status[`recipe:${recipe.id}`]}
              adminError={error[`recipe:${recipe.id}`]}
              onAdminAction={(action) => {
                void run(`recipe:${recipe.id}`, () =>
                  handleRecipeAdminAction({
                    action,
                    country,
                    recipe,
                    communityRecipes,
                    onCountryUpdated,
                    onCommunityRecipesChange,
                  }),
                );
              }}
            />
          );
        })}
      </ul>

      {filteredRecipes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stamp/40 bg-white/50 p-5 text-ink-soft">
          {t("cook.empty.recipes")}
        </p>
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl text-ink">{t("cook.drinks.heading")}</h3>
            <p className="text-sm text-ink-soft">
              {t("cook.drinks.subtitle")}
            </p>
          </div>
          <FilterRow
            label={t("cook.filter.drinks")}
            options={alcoholFilters}
            value={alcoholFilter}
            onChange={setAlcoholFilter}
          />
        </div>

        {drinkSections.map((section) => (
          <div key={section.id} className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t(`cook.drinks.section.${section.id}` as const)}
            </h4>
            <ul className="grid gap-3 sm:grid-cols-2">
              {section.drinks.map((item) => (
                <li key={`${section.id}-${item.name}-${item.type}`}>
                  <DrinkCard drink={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {filteredDrinks.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("cook.drinks.empty")}</p>
        ) : null}
      </div>

      {shops.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-2xl text-ink">{t("cook.shops.heading")}</h3>
            <p className="text-sm text-ink-soft">
              {t("cook.shops.subtitle", { name: country.name })}
            </p>
          </div>
          <ul className="grid gap-3">
            {shops.map((shop) => (
              <li
                key={shop.id}
                className="relative rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
              >
                {isAdmin ? (
                  <AdminItemMenu
                    className="absolute right-3 top-3"
                    label={shop.name}
                    showReplaceImage={false}
                    busy={Boolean(busy[`shop:${shop.id}`])}
                    status={status[`shop:${shop.id}`]}
                    error={error[`shop:${shop.id}`]}
                    onAction={(action) => {
                      void run(`shop:${shop.id}`, () =>
                        handleShopAdminAction({
                          action,
                          country,
                          shop,
                          onCountryUpdated,
                        }),
                      );
                    }}
                  />
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className={isAdmin ? "pr-12" : undefined}>
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
                        {t("cook.shops.website")}
                        <ExternalLink aria-hidden="true" className="size-4" />
                      </a>
                    ) : null}
                    <a
                      href={shop.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                    >
                      {t("cook.shops.openInMaps")}
                      <ExternalLink aria-hidden="true" className="size-4" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SuggestModal
        kind="recipe"
        country={country}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onAdded={(result) => {
          if (result.kind === "recipe") {
            onCommunityRecipesChange([result.recipe, ...communityRecipes]);
          }
        }}
      />
    </section>
  );
}

function DrinkCard({ drink }: { drink: Drink }) {
  const t = useT();

  return (
    <article className="flex gap-3 rounded-2xl border border-dashed border-stamp/40 bg-white/40 p-4">
      {drink.imageUrl ? (
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-parchment">
          <img
            src={drink.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {drink.name}
          {drink.localName ? (
            <span className="font-normal text-ink-soft">
              {" "}
              · {drink.localName}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {drink.alcoholic
            ? t("cook.drink.alcoholic")
            : t("cook.drink.nonAlcoholic")}{" "}
          · {drink.type}
          {drink.grape ? ` · ${drink.grape}` : null}
        </p>
        <p className="mt-2 text-sm text-ink-soft">{drink.description}</p>
        {drink.foodPairing ? (
          <p className="mt-2 text-sm text-ink">
            <span className="font-semibold">
              {t("cook.drink.foodPairing")}:{" "}
            </span>
            {drink.foodPairing}
          </p>
        ) : null}
        {drink.imageAttribution ? (
          <p className="mt-1 text-[0.65rem] text-ink-soft">
            {drink.imageAttribution}
          </p>
        ) : null}
      </div>
    </article>
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
