import { useState } from "react";
import type { ReactNode } from "react";
import type { Country } from "@/types/content";
import { CountrySelect } from "@/components/CountrySelect";
import { SpinSpoonButton } from "@/components/SpinSpoonButton";
import { useT } from "@/i18n/LocaleContext";
import { images } from "@/lib/images";

const SPIN_CLICKED_KEY = "spoonspin:spin-clicked";

function hasClickedSpin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SPIN_CLICKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSpinClicked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPIN_CLICKED_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

type HomeHeroProps = {
  countries: Country[];
  onPick: () => void;
  onSelectCountry: (code: string) => void;
  children?: ReactNode;
};

export function HomeHero({
  countries,
  onPick,
  onSelectCountry,
  children,
}: HomeHeroProps) {
  const t = useT();
  const [showSpinNudge, setShowSpinNudge] = useState(() => !hasClickedSpin());

  function handlePick() {
    markSpinClicked();
    setShowSpinNudge(false);
    onPick();
  }

  return (
    <div className="relative isolate min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={images.hero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover animate-hero-drift"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/65 via-ink/25 to-transparent"
        />
      </div>

      <section
        aria-labelledby="hero-heading"
        className="relative z-10 mx-auto flex min-h-[min(88vh,48rem)] w-full max-w-5xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 sm:pb-14"
      >
        <p className="animate-rise-in font-display text-[clamp(3.5rem,14vw,8.5rem)] leading-[0.85] text-ochre">
          {t("app.brand")}
        </p>
        <h1
          id="hero-heading"
          className="animate-rise-in-delay mt-5 max-w-xl font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] text-ochre"
        >
          {t("hero.heading")}
        </h1>
        <p className="animate-rise-in-delay-2 mt-4 max-w-md text-lg text-cream/85">
          {t("hero.subtitle")}
        </p>

        <div className="animate-fade-in relative z-30 mt-10 flex flex-col items-stretch gap-6 sm:max-w-md">
          <div className="flex flex-col items-stretch gap-1">
            {showSpinNudge ? (
              <div
                role="status"
                className="mx-auto flex w-full max-w-sm flex-col items-center animate-nudge-bounce"
              >
                <div className="w-full rounded-2xl border-4 border-tomato bg-cream px-5 py-4 text-center shadow-[0_10px_0_#7a1f18,0_18px_36px_rgba(192,57,43,0.35)]">
                  <p className="font-display text-2xl leading-tight text-tomato sm:text-3xl">
                    {t("spin.nudge")}
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="h-0 w-0 border-x-[18px] border-t-[22px] border-x-transparent border-t-tomato"
                />
              </div>
            ) : null}
            <SpinSpoonButton spinning={false} onClick={handlePick} size="lg" />
          </div>
          <div className="rounded-2xl bg-cream/10 p-3 backdrop-blur-sm ring-1 ring-cream/20">
            <CountrySelect
              countries={countries}
              onSelect={onSelectCountry}
              id="home-country-select"
              tone="dark"
            />
          </div>
        </div>
      </section>

      {children ? <div className="relative z-10 pb-12">{children}</div> : null}
    </div>
  );
}
