import { Clock3, Flame } from "lucide-react";
import type { Country, Recipe } from "@/types/content";

type CookMenuProps = {
  country: Country;
  onOpenRecipe: (recipe: Recipe) => void;
};

export function CookMenu({ country, onOpenRecipe }: CookMenuProps) {
  const courses: Array<{ label: string; recipe: Recipe }> = [
    { label: "Starter", recipe: country.menu.starter },
    { label: "Main course", recipe: country.menu.main },
    { label: "Side dish", recipe: country.menu.side },
    { label: "Dessert", recipe: country.menu.dessert },
  ];

  return (
    <section aria-labelledby="menu-heading" className="space-y-4">
      <div>
        <h2 id="menu-heading" className="font-display text-3xl text-ink">
          Tonight&apos;s menu
        </h2>
        <p className="mt-1 text-ink-soft">
          A typical {country.name} spread. Open any dish for the full recipe.
        </p>
      </div>

      <ul className="grid gap-3">
        {courses.map(({ label, recipe }) => {
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
                    {label}
                    {isNational ? " · iconic national dish" : ""}
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

      <div className="rounded-2xl border border-dashed border-stamp/40 bg-white/40 p-5">
        <h3 className="font-display text-xl text-ink">Typical drink pairing</h3>
        <p className="mt-2 font-semibold">
          {country.menu.drink.name}
          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {country.menu.drink.alcoholic ? "Alcoholic" : "Non-alcoholic"}
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-soft">{country.menu.drink.description}</p>
      </div>
    </section>
  );
}
