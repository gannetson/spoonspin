import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import type { Country, Drink, Recipe } from "@/types/content";
import { formatQuantity, scaleIngredients } from "@/lib/scaleIngredients";

type RecipeViewProps = {
  country: Country;
  recipe: Recipe;
  drink: Drink;
  onBack: () => void;
};

export function RecipeView({ country, recipe, drink, onBack }: RecipeViewProps) {
  const [servings, setServings] = useState(recipe.servings);
  const scaled = useMemo(
    () => scaleIngredients(recipe.ingredients, recipe.servings, servings),
    [recipe.ingredients, recipe.servings, servings],
  );
  const isNational = recipe.id === country.nationalDishId;

  return (
    <article
      aria-labelledby="recipe-heading"
      className="rounded-[2rem] border border-ink/10 bg-cream p-5 shadow-sm print:border-0 print:shadow-none sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to menu
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
        >
          <Printer aria-hidden="true" className="size-4" />
          Print recipe
        </button>
      </div>

      <header className="mt-5">
        {isNational ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato">
            Iconic national dish
          </p>
        ) : null}
        <h2 id="recipe-heading" className="font-display text-4xl text-ink">
          {recipe.name}
        </h2>
        {recipe.localName ? (
          <p className="mt-1 text-lg text-ink-soft">{recipe.localName}</p>
        ) : null}
        <p className="mt-4 max-w-2xl text-ink-soft">{recipe.description}</p>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Servings" value={String(servings)} />
        <Meta label="Prep" value={`${recipe.prepMinutes} min`} />
        <Meta label="Cook" value={`${recipe.cookMinutes} min`} />
        <Meta label="Difficulty" value={recipe.difficulty} />
      </dl>

      {recipe.dietaryLabels.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Dietary labels">
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
          Adjust servings
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
          Scaled from original {recipe.servings} servings
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="ingredients-heading">
          <h3 id="ingredients-heading" className="font-display text-2xl">
            Ingredients
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
            Preparation
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
            Dutch kitchen substitutions
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
            <h3 className="font-display text-xl">Serving suggestion</h3>
            <p className="mt-2 text-sm text-ink-soft">{recipe.servingSuggestion}</p>
          </div>
        ) : null}
        <div className="rounded-2xl bg-parchment p-4">
          <h3 className="font-display text-xl">Drink pairing</h3>
          <p className="mt-2 text-sm text-ink-soft">
            {recipe.drinkPairing ??
              `${drink.name} (${drink.alcoholic ? "alcoholic" : "non-alcoholic"}) — ${drink.description}`}
          </p>
        </div>
      </section>
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
