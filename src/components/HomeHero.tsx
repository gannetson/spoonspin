import type { Country } from "@/types/content";
import { CountrySelect } from "@/components/CountrySelect";
import { SpinSpoonButton } from "@/components/SpinSpoonButton";
import { useT } from "@/i18n/LocaleContext";
import { images } from "@/lib/images";

type HomeHeroProps = {
  countries: Country[];
  onPick: () => void;
  onSelectCountry: (code: string) => void;
};

export function HomeHero({ countries, onPick, onSelectCountry }: HomeHeroProps) {
  const t = useT();

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden"
    >
      <img
        src={images.hero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover animate-hero-drift"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/35"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-[min(92vh,52rem)] w-full max-w-5xl flex-col justify-end px-4 pb-14 pt-16 sm:px-6 sm:pb-20">
        <p className="animate-rise-in font-display text-[clamp(3.5rem,14vw,8.5rem)] leading-[0.85] text-cream">
          {t("app.brand")}
        </p>
        <h1
          id="hero-heading"
          className="animate-rise-in-delay mt-5 max-w-xl font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] text-cream"
        >
          {t("hero.heading")}
        </h1>
        <p className="animate-rise-in-delay-2 mt-4 max-w-md text-lg text-cream/85">
          {t("hero.subtitle")}
        </p>

        <div className="animate-fade-in mt-10 flex flex-col items-stretch gap-6 sm:max-w-md">
          <SpinSpoonButton spinning={false} onClick={onPick} size="lg" />
          <div className="rounded-2xl bg-cream/10 p-3 backdrop-blur-sm ring-1 ring-cream/20">
            <CountrySelect
              countries={countries}
              onSelect={onSelectCountry}
              id="home-country-select"
              tone="dark"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
