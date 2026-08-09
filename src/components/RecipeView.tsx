import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, PlayCircle, Printer } from "lucide-react";
import type { Country, Drink, Recipe } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { formatQuantity, scaleIngredients } from "@/lib/scaleIngredients";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import {
  handleRecipeAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type RecipeViewProps = {
  country: Country;
  recipe: Recipe;
  drink: Drink;
  communityRecipes: Recipe[];
  onCommunityRecipesChange: (recipes: Recipe[]) => void;
  onCountryUpdated: (country: Country) => void;
  onBack: () => void;
};

const DIFFICULTY_KEYS: Record<Recipe["difficulty"], string> = {
  easy: "recipe.difficulty.easy",
  medium: "recipe.difficulty.medium",
  challenging: "recipe.difficulty.challenging",
};

export function RecipeView({
  country,
  recipe,
  drink,
  communityRecipes,
  onCommunityRecipesChange,
  onCountryUpdated,
  onBack,
}: RecipeViewProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const { openSelectImage } = useSelectImage();
  const [servings, setServings] = useState(recipe.servings);
  const scaled = useMemo(
    () => scaleIngredients(recipe.ingredients, recipe.servings, servings),
    [recipe.ingredients, recipe.servings, servings],
  );
  const isNational = recipe.id === country.nationalDishId;
  const imageSrc = recipe.imageUrl?.trim() || null;
  const adminKey = `recipe:${recipe.id}`;

  const sourceLabel = recipe.sourceUrl?.includes("wikibooks.org")
    ? t("recipe.source.cookbook")
    : recipe.sourceUrl?.includes("wikipedia.org")
      ? t("recipe.source.aboutDish")
      : t("recipe.source.moreRecipes");

  return (
    <article
      aria-labelledby="recipe-heading"
      className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream shadow-sm print:border-0 print:shadow-none"
    >
      <div className="relative h-52 overflow-hidden sm:h-72 print:hidden">
        {imageSrc ? (
          <img src={imageSrc} alt="" className="size-full object-cover" />
        ) : (
          <MediaPlaceholder
            labelKey="media.placeholder.recipe"
            tone="dark"
            className="absolute inset-0"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent"
        />
        {isAdmin ? (
          <AdminItemMenu
            className="absolute right-4 top-4"
            label={recipe.name}
            tone="dark"
            showSelectForDinner
            replaceImageHintKey="admin.item.replaceImage.dish.hint"
            busy={Boolean(busy[adminKey])}
            status={status[adminKey]}
            error={error[adminKey]}
            onAction={(action) => {
              void run(adminKey, () =>
                handleRecipeAdminAction({
                  action,
                  country,
                  recipe,
                  communityRecipes,
                  onCountryUpdated,
                  onCommunityRecipesChange,
                  onRemoved: onBack,
                  openSelectImage,
                }),
              );
            }}
          />
        ) : null}
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("recipe.backToMenu")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
          >
            <Printer aria-hidden="true" className="size-4" />
            {t("recipe.print")}
          </button>
        </div>

        <header className="mt-5">
          {isNational ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato">
              {t("recipe.iconicNationalDish")}
            </p>
          ) : null}
          <h2 id="recipe-heading" className="font-display text-4xl text-ink sm:text-5xl">
            {recipe.name}
          </h2>
          {recipe.localName ? (
            <p className="mt-1 text-lg text-ink-soft">{recipe.localName}</p>
          ) : null}
          <p className="mt-4 max-w-2xl text-ink-soft">{recipe.description}</p>
          <ItemTagBar
            className="mt-4"
            entityType="recipe"
            entityId={recipe.id}
            entityName={recipe.name}
            countryCode={country.code}
          />
          {recipe.imageAttribution ? (
            <p className="mt-2 text-xs text-ink-soft/80">{recipe.imageAttribution}</p>
          ) : null}
          {(recipe.sourceUrl || recipe.videoUrl) && (
            <div className="mt-4 flex flex-wrap gap-3 print:hidden">
              {recipe.sourceUrl ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  {sourceLabel}
                </a>
              ) : null}
              {recipe.videoUrl ? (
                <a
                  href={recipe.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                >
                  <PlayCircle aria-hidden="true" className="size-4" />
                  {t("recipe.watchVideos")}
                </a>
              ) : null}
            </div>
          )}
        </header>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label={t("recipe.meta.servings")} value={String(servings)} />
          <Meta
            label={t("recipe.meta.prep")}
            value={t("recipe.meta.minutes", { minutes: recipe.prepMinutes })}
          />
          <Meta
            label={t("recipe.meta.cook")}
            value={t("recipe.meta.minutes", { minutes: recipe.cookMinutes })}
          />
          <Meta
            label={t("recipe.meta.difficulty")}
            value={t(DIFFICULTY_KEYS[recipe.difficulty])}
          />
        </dl>

        {recipe.dietaryLabels.length > 0 ? (
          <ul
            className="mt-4 flex flex-wrap gap-2"
            aria-label={t("recipe.dietaryLabels.aria")}
          >
            {recipe.dietaryLabels.map((label) => (
              <li
                key={label}
                className="rounded-full bg-parchment-deep px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink"
              >
                {label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
          <label htmlFor="servings" className="text-sm font-semibold text-ink">
            {t("recipe.adjustServings")}
          </label>
          <input
            id="servings"
            type="number"
            min={1}
            max={24}
            value={servings}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next) && next >= 1) setServings(next);
            }}
            className="min-h-11 w-24 rounded-xl border border-ink/20 bg-white px-3 text-ink"
          />
          <p className="text-sm text-ink-soft">
            {t("recipe.scaledFrom", { count: recipe.servings })}
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="ingredients-heading">
            <h3 id="ingredients-heading" className="font-display text-2xl">
              {t("recipe.ingredients")}
            </h3>
            <ul className="mt-3 space-y-2">
              {scaled.map((ingredient) => (
                <li
                  key={`${ingredient.name}-${ingredient.unit}`}
                  className="border-b border-ink/10 pb-2 text-ink"
                >
                  <span className="font-semibold">
                    {formatQuantity(ingredient.quantity, ingredient.unit)}
                  </span>{" "}
                  {ingredient.name}
                  {ingredient.note ? (
                    <span className="text-ink-soft"> ({ingredient.note})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="steps-heading">
            <h3 id="steps-heading" className="font-display text-2xl">
              {t("recipe.preparation")}
            </h3>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-ink">
              {recipe.steps.map((step) => (
                <li key={step} className="pl-1">
                  {step.replace(/^\d+\.\s*/, "")}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {recipe.substitutions && recipe.substitutions.length > 0 ? (
          <section className="mt-8" aria-labelledby="subs-heading">
            <h3 id="subs-heading" className="font-display text-2xl">
              {t("recipe.substitutions")}
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
              {recipe.substitutions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {recipe.servingSuggestion ? (
            <div className="rounded-2xl bg-parchment p-4">
              <h3 className="font-display text-xl">{t("recipe.servingSuggestion")}</h3>
              <p className="mt-2 text-sm text-ink-soft">{recipe.servingSuggestion}</p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-parchment p-4">
            <h3 className="font-display text-xl">{t("recipe.drinkPairing")}</h3>
            <p className="mt-2 text-sm text-ink-soft">
              {recipe.drinkPairing ??
                `${drink.name} (${
                  drink.alcoholic
                    ? t("cook.drink.alcoholic")
                    : t("cook.drink.nonAlcoholic")
                }) — ${drink.description}`}
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-parchment px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1 font-semibold capitalize text-ink">{value}</dd>
    </div>
  );
}
