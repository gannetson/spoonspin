import type { Country } from "@/types/content";
import { CountrySelect } from "@/components/CountrySelect";
import { SpinSpoonButton } from "@/components/SpinSpoonButton";

type HomeHeroProps = {
  countries: Country[];
  onPick: () => void;
  onSelectCountry: (code: string) => void;
};

export function HomeHero({ countries, onPick, onSelectCountry }: HomeHeroProps) {
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

      <div className="mt-10 flex flex-col items-center gap-8 sm:items-start">
        <SpinSpoonButton spinning={false} onClick={onPick} size="lg" />
        <CountrySelect
          countries={countries}
          onSelect={onSelectCountry}
          id="home-country-select"
        />
      </div>
    </section>
  );
}
