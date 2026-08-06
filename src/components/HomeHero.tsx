import { ChefHat } from "lucide-react";

type HomeHeroProps = {
  onPick: () => void;
};

export function HomeHero({ onPick }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-cream/80 px-6 py-12 shadow-[0_20px_60px_rgba(59,31,58,0.08)] sm:px-10 sm:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 top-6 rotate-12 stamp-border rounded-full px-6 py-10 text-stamp/40"
      >
        VISA
      </div>

      <p className="font-display text-5xl leading-none text-tomato sm:text-7xl">
        Spoon Spin
      </p>
      <h1
        id="hero-heading"
        className="mt-6 max-w-xl font-display text-3xl leading-tight text-ink sm:text-5xl"
      >
        Where in the world will you eat today?
      </h1>
      <p className="mt-4 max-w-lg text-lg text-ink-soft">
        Spin the globe, land on a cuisine, then cook at home or dine out in the
        Netherlands.
      </p>

      <button
        type="button"
        onClick={onPick}
        className="mt-10 inline-flex min-h-14 items-center gap-3 rounded-full bg-tomato px-8 text-lg font-semibold text-cream shadow-lg shadow-tomato/25 transition hover:bg-tomato-deep"
      >
        <ChefHat aria-hidden="true" className="size-6" />
        Pick a country
      </button>
    </section>
  );
}
