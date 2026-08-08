import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Plus, Store, UtensilsCrossed } from "lucide-react";
import type { Country, Drink, Recipe, RecipeCategory, SpecialtyShop } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import {
  dinnerRecipeIdSet,
  drinkMatchesAlcohol,
  getCountryDrinks,
  getCountryRecipes,
  getDinnerSuggestion,
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
  handleDinnerCourseAdminAction,
  handleDinnerDrinkAdminAction,
  handleDrinkAdminAction,
  handleRecipeAdminAction,
  handleShopAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useT } from "@/i18n/LocaleContext";
import type { SuggestionKind } from "@/suggestions/client";

type CookMenuProps = {
  country: Country;
  communityRecipes: Recipe[];
  communityDrinks: Drink[];
  communityShops: SpecialtyShop[];
  onCommunityRecipesChange: (recipes: Recipe[]) => void;
  onCommunityDrinksChange: (drinks: Drink[]) => void;
  onCommunityShopsChange: (shops: SpecialtyShop[]) => void;
  onCountryUpdated: (country: Country) => void;
  onOpenRecipe: (recipe: Recipe) => void;
};

type CookTab = "dinner" | "recipes" | "drinks" | "shops";
type CategoryFilter = "all" | RecipeCategory;
type DietFilter = "all" | "vegan" | "vegetarian" | "meat";
type AlcoholFilter =
  | "all"
  | "other-alcoholic"
  | "non-alcoholic"
  | "beer"
  | "wine";

const TABS: CookTab[] = ["dinner", "recipes", "drinks", "shops"];

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

const COURSE_KEYS: Record<RecipeCategory | "extra", string> = {
  starter: "cook.course.starter",
  main: "cook.course.main",
  side: "cook.course.side",
  dessert: "cook.course.dessert",
  snack: "cook.course.snack",
  extra: "cook.course.extra",
};

export function CookMenu({
  country,
  communityRecipes,
  communityDrinks,
  communityShops,
  onCommunityRecipesChange,
  onCommunityDrinksChange,
  onCommunityShopsChange,
  onCountryUpdated,
  onOpenRecipe,
}: CookMenuProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const [tab, setTab] = useState<CookTab>("dinner");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [alcoholFilter, setAlcoholFilter] = useState<AlcoholFilter>("all");
  const [suggestKind, setSuggestKind] = useState<SuggestionKind | null>(null);

  const authoredRecipes = useMemo(() => getCountryRecipes(country), [country]);
  const recipes = useMemo(() => {
    const seen = new Set(authoredRecipes.map((recipe) => recipe.id));
    return [
      ...authoredRecipes,
      ...communityRecipes.filter((recipe) => !seen.has(recipe.id)),
    ];
  }, [authoredRecipes, communityRecipes]);
  const authoredDrinks = useMemo(() => getCountryDrinks(country), [country]);
  const drinks = useMemo(() => {
    const seen = new Set(
      authoredDrinks.map((drink) => drink.id ?? `${drink.name}|${drink.type}`),
    );
    return [
      ...authoredDrinks,
      ...communityDrinks.filter((drink) => {
        const key = drink.id ?? `${drink.name}|${drink.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }, [authoredDrinks, communityDrinks]);
  const authoredShops = useMemo(() => getSpecialtyShops(country), [country]);
  const shops = useMemo(() => {
    const seen = new Set(authoredShops.map((shop) => shop.id));
    return [
      ...authoredShops,
      ...communityShops.filter((shop) => !seen.has(shop.id)),
    ];
  }, [authoredShops, communityShops]);
  const communityRecipeIds = useMemo(
    () => new Set(communityRecipes.map((recipe) => recipe.id)),
    [communityRecipes],
  );
  const communityDrinkKeys = useMemo(
    () =>
      new Set(
        communityDrinks.map(
          (drink) => drink.id ?? `${drink.name}|${drink.type}`,
        ),
      ),
    [communityDrinks],
  );
  const communityShopIds = useMemo(
    () => new Set(communityShops.map((shop) => shop.id)),
    [communityShops],
  );
  const bannerUrl = cookBannerUrl(country);
  const dinner = useMemo(() => getDinnerSuggestion(country), [country]);
  const dinnerIds = useMemo(() => dinnerRecipeIdSet(country), [country]);
  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const recipe of recipes) map.set(recipe.id, recipe);
    return map;
  }, [recipes]);

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

  function suggestButton(kind: SuggestionKind, labelKey: string) {
    return (
      <button
        type="button"
        onClick={() => setSuggestKind(kind)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t(labelKey)}
      </button>
    );
  }

  const suggestModal = (
    <SuggestModal
      kind={suggestKind ?? "recipe"}
      country={country}
      open={suggestKind != null}
      onClose={() => setSuggestKind(null)}
      onAdded={(result) => {
        if (result.kind === "recipe") {
          onCommunityRecipesChange([result.recipe, ...communityRecipes]);
        } else if (result.kind === "drink") {
          onCommunityDrinksChange([result.drink, ...communityDrinks]);
        } else if (result.kind === "shop") {
          onCommunityShopsChange([result.shop, ...communityShops]);
        }
      }}
    />
  );

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

      <div
        role="tablist"
        aria-label={t("cook.tabs.label")}
        className="flex flex-wrap gap-2 rounded-2xl bg-cream p-2 ring-1 ring-ink/10"
      >
        {TABS.map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(value)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-ink text-cream"
                  : "text-ink hover:bg-ink/5"
              }`}
            >
              {t(`cook.tabs.${value}`)}
            </button>
          );
        })}
      </div>

      {tab === "dinner" ? (
        <div role="tabpanel">
          {dinner ? (
            <article className="overflow-hidden rounded-[1.75rem] bg-cream ring-1 ring-ink/10">
              <header className="space-y-4 px-6 pb-2 pt-6 sm:px-10 sm:pt-10">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                  <UtensilsCrossed aria-hidden="true" className="size-4" />
                  {t("cook.dinner.kicker")}
                </p>
                <h3 className="max-w-3xl font-display text-4xl leading-tight text-ink sm:text-5xl">
                  {dinner.title}
                </h3>
                <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">
                  {dinner.description}
                </p>
              </header>

              <div className="mt-4 divide-y divide-ink/10">
                {dinner.courses.map((course, index) => {
                  const recipe = recipesById.get(course.recipeId);
                  if (!recipe) return null;
                  const imageUrl = recipe.imageUrl?.trim() || null;
                  const imageLeft = index % 2 === 0;
                  return (
                    <section
                      key={`${course.recipeId}-${index}`}
                      className={`relative grid items-stretch gap-0 md:grid-cols-2 ${
                        imageLeft ? "" : "md:[&>figure]:order-2"
                      }`}
                    >
                      {isAdmin ? (
                        <AdminItemMenu
                          className="absolute right-3 top-3"
                          label={recipe.name}
                          removeOnly
                          removeHintKey="admin.item.removeFromDinner.hint"
                          busy={Boolean(busy[`dinner-course:${course.recipeId}`])}
                          status={status[`dinner-course:${course.recipeId}`]}
                          error={error[`dinner-course:${course.recipeId}`]}
                          onAction={(action) => {
                            void run(`dinner-course:${course.recipeId}`, () =>
                              handleDinnerCourseAdminAction({
                                action,
                                country,
                                recipeId: course.recipeId,
                                recipeName: recipe.name,
                                onCountryUpdated,
                              }),
                            );
                          }}
                        />
                      ) : null}
                      <figure className="relative min-h-56 bg-parchment md:min-h-72">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <MediaPlaceholder
                            labelKey="media.placeholder.recipe"
                            className="absolute inset-0"
                          />
                        )}
                      </figure>
                      <div className="flex flex-col justify-center space-y-3 px-6 py-8 sm:px-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                          {t("cook.dinner.courseLabel", {
                            index: index + 1,
                            course: t(COURSE_KEYS[course.role]),
                          })}
                        </p>
                        <h4 className="font-display text-3xl text-ink">
                          {recipe.name}
                          {recipe.localName ? (
                            <span className="mt-1 block font-sans text-base font-normal text-ink-soft">
                              {recipe.localName}
                            </span>
                          ) : null}
                        </h4>
                        <p className="text-base leading-relaxed text-ink-soft">
                          {recipe.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpenRecipe(recipe)}
                          className="self-start text-sm font-semibold text-tomato underline-offset-2 hover:underline"
                        >
                          {t("cook.dinner.openRecipe")}
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>

              {dinner.drinks.length > 0 ? (
                <footer className="space-y-5 border-t border-ink/10 bg-ochre/40 px-6 py-8 sm:px-10">
                  <h4 className="font-display text-3xl text-ink">
                    {t("cook.dinner.drinksHeading")}
                  </h4>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {dinner.drinks.map((suggestion) => {
                      const drink = drinks.find(
                        (item) =>
                          item.name.toLowerCase() ===
                          suggestion.drinkName.toLowerCase(),
                      );
                      const drinkImage = drink?.imageUrl?.trim() || null;
                      return (
                        <div
                          key={suggestion.drinkName}
                          className="relative flex gap-4 pr-12"
                        >
                          {isAdmin ? (
                            <AdminItemMenu
                              className="absolute right-0 top-0"
                              label={suggestion.drinkName}
                              removeOnly
                              removeHintKey="admin.item.removeFromDinner.hint"
                              busy={Boolean(
                                busy[`dinner-drink:${suggestion.drinkName}`],
                              )}
                              status={
                                status[`dinner-drink:${suggestion.drinkName}`]
                              }
                              error={
                                error[`dinner-drink:${suggestion.drinkName}`]
                              }
                              onAction={(action) => {
                                void run(
                                  `dinner-drink:${suggestion.drinkName}`,
                                  () =>
                                    handleDinnerDrinkAdminAction({
                                      action,
                                      country,
                                      drinkName: suggestion.drinkName,
                                      onCountryUpdated,
                                    }),
                                );
                              }}
                            />
                          ) : null}
                          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-parchment">
                            {drinkImage ? (
                              <img
                                src={drinkImage}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <MediaPlaceholder
                                labelKey="media.placeholder.recipe"
                                compact
                                className="absolute inset-0"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-xl text-ink">
                              {drink?.name ?? suggestion.drinkName}
                              {drink?.localName ? (
                                <span className="ml-2 font-sans text-sm font-normal text-ink-soft">
                                  {drink.localName}
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                              {drink?.description ||
                                suggestion.note?.trim() ||
                                ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("drinks")}
                    className="text-sm font-semibold text-tomato underline-offset-2 hover:underline"
                  >
                    {t("cook.dinner.openDrinks")}
                  </button>
                </footer>
              ) : null}
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-stamp/40 bg-cream/60 p-6 text-ink-soft">
              <p>{t("cook.dinner.empty", { name: country.name })}</p>
              {recipes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setTab("recipes")}
                  className="mt-4 text-sm font-semibold text-tomato underline-offset-2 hover:underline"
                >
                  {t("cook.dinner.browseRecipes")}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "recipes" ? (
        <div role="tabpanel" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {suggestButton("recipe", "cook.suggestRecipe")}
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
              const isDinner = dinnerIds.has(recipe.id);
              const isCommunity = communityRecipeIds.has(recipe.id);
              return (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  variant={
                    isDinner
                      ? "dinner"
                      : isNational
                        ? "national"
                        : isCommunity
                          ? "community"
                          : "default"
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
        </div>
      ) : null}

      {tab === "drinks" ? (
        <div role="tabpanel" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-2xl text-ink">
                {t("cook.drinks.heading")}
              </h3>
              <p className="text-sm text-ink-soft">{t("cook.drinks.subtitle")}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              {suggestButton("drink", "cook.suggestDrink")}
              <FilterRow
                label={t("cook.filter.drinks")}
                options={alcoholFilters}
                value={alcoholFilter}
                onChange={setAlcoholFilter}
              />
            </div>
          </div>

          {drinkSections.map((section) => (
            <div key={section.id} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                {t(`cook.drinks.section.${section.id}` as const)}
              </h4>
              <ul className="grid gap-3 sm:grid-cols-2">
                {section.drinks.map((item) => {
                  const key = item.id ?? `${item.name}|${item.type}`;
                  return (
                    <li key={`${section.id}-${key}`}>
                      <DrinkCard
                        drink={item}
                        community={communityDrinkKeys.has(key)}
                        isAdmin={isAdmin}
                        adminBusy={Boolean(busy[`drink:${key}`])}
                        adminStatus={status[`drink:${key}`]}
                        adminError={error[`drink:${key}`]}
                        onAdminAction={(action) => {
                          void run(`drink:${key}`, () =>
                            handleDrinkAdminAction({
                              action,
                              country,
                              drink: item,
                              onCountryUpdated,
                            }),
                          );
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {filteredDrinks.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("cook.drinks.empty")}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "shops" ? (
        <div role="tabpanel" className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">
                {t("cook.shops.heading")}
              </h3>
              <p className="text-sm text-ink-soft">
                {t("cook.shops.subtitle", { name: country.name })}
              </p>
            </div>
            {suggestButton("shop", "cook.suggestShop")}
          </div>
          {shops.length > 0 ? (
            <ul className="grid gap-3">
              {shops.map((shop) => (
                <li
                  key={shop.id}
                  className="relative rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
                >
                  {communityShopIds.has(shop.id) ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
                      {t("cook.communitySuggestion")}
                    </p>
                  ) : null}
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
          ) : (
            <p className="text-sm text-ink-soft">{t("cook.shops.empty")}</p>
          )}
        </div>
      ) : null}

      {suggestModal}
    </section>
  );
}

function DrinkCard({
  drink,
  community = false,
  isAdmin = false,
  adminBusy = false,
  adminStatus = null,
  adminError = null,
  onAdminAction,
}: {
  drink: Drink;
  community?: boolean;
  isAdmin?: boolean;
  adminBusy?: boolean;
  adminStatus?: string | null;
  adminError?: string | null;
  onAdminAction?: (action: import("@/components/AdminItemMenu").AdminItemAction) => void;
}) {
  const t = useT();

  return (
    <article className="relative flex gap-3 rounded-2xl border border-dashed border-stamp/40 bg-white/40 p-4">
      {isAdmin && onAdminAction ? (
        <AdminItemMenu
          className="absolute right-2 top-2"
          label={drink.name}
          showSelectForDinner
          selectForDinnerHintKey="admin.item.selectForDinner.drink.hint"
          busy={adminBusy}
          status={adminStatus}
          error={adminError}
          onAction={onAdminAction}
        />
      ) : null}
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
      <div className={`min-w-0 flex-1 ${isAdmin ? "pr-10" : ""}`}>
        {community ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
            {t("cook.communitySuggestion")}
          </p>
        ) : null}
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
