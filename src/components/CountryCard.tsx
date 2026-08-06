import { Beer, UtensilsCrossed } from "lucide-react";
import type { Country } from "@/types/content";

type CountryCardProps = {
  country: Country;
};

export function CountryCard({ country }: CountryCardProps) {
  const nationalDish =
    [
      country.menu.starter,
      country.menu.main,
      country.menu.side,
      country.menu.dessert,
    ].find((recipe) => recipe.id === country.nationalDishId) ?? country.menu.main;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-ink/10 bg-gradient-to-br from-cream via-parchment to-parchment-deep shadow-[0_18px_50px_rgba(59,31,58,0.1)]">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <div
          aria-hidden="true"
          className="flex size-28 items-center justify-center rounded-3xl bg-ink text-7xl shadow-inner sm:size-36 sm:text-8xl"
        >
          {country.flag}
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-stamp">
            {country.region}
          </p>
          <h2 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
            {country.name}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
            {country.introduction}
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-ink/10 bg-cream/60 p-6 sm:grid-cols-2 sm:p-8">
        <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-ink/5">
          <div className="flex items-center gap-2 text-tomato">
            <UtensilsCrossed aria-hidden="true" className="size-5" />
            <h3 className="font-display text-xl">Iconic dish</h3>
          </div>
          <p className="mt-2 font-semibold text-ink">
            {nationalDish.name}
            {nationalDish.localName ? (
              <span className="font-normal text-ink-soft">
                {" "}
                · {nationalDish.localName}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{nationalDish.description}</p>
        </div>

        <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-ink/5">
          <div className="flex items-center gap-2 text-saffron">
            <Beer aria-hidden="true" className="size-5" />
            <h3 className="font-display text-xl">Typical drink</h3>
          </div>
          <p className="mt-2 font-semibold text-ink">
            {country.nationalDrink.name}
            {country.nationalDrink.localName ? (
              <span className="font-normal text-ink-soft">
                {" "}
                · {country.nationalDrink.localName}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {country.nationalDrink.alcoholic ? "Alcoholic" : "Non-alcoholic"} ·{" "}
            {country.nationalDrink.type}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {country.nationalDrink.description}
          </p>
        </div>
      </div>
    </article>
  );
}
