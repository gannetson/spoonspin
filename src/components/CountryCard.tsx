import { ExternalLink } from "lucide-react";
import type { Country } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { AdminCountryHeroMenu } from "@/components/AdminCountryHeroMenu";
import { SpinSpoonButton } from "@/components/SpinSpoonButton";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { cuisineBannerUrl } from "@/content/countries/cuisineImages";
import { useT } from "@/i18n/LocaleContext";

type CountryCardProps = {
  country: Country;
  spinning?: boolean;
  spinningCountry?: { flag: string; name: string };
  onSpin: () => void;
  onCountryUpdated?: (country: Country) => void;
};

export function CountryCard({
  country,
  spinning = false,
  spinningCountry,
  onSpin,
  onCountryUpdated,
}: CountryCardProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const flag = spinning ? (spinningCountry?.flag ?? "🌍") : country.flag;
  const name = spinning ? (spinningCountry?.name ?? "…") : country.name;
  const description = country.wikipedia?.summary ?? country.introduction;
  const bannerUrl = cuisineBannerUrl(country);

  return (
    <article
      aria-busy={spinning}
      className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream shadow-[0_18px_50px_rgba(20,32,28,0.1)]"
    >
      <div className="relative h-44 overflow-hidden sm:h-56">
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
          className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10"
        />
        {isAdmin && onCountryUpdated && !spinning ? (
          <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
            <AdminCountryHeroMenu
              country={country}
              onCountryUpdated={onCountryUpdated}
            />
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-cream/75">
              {spinning ? t("country.card.choosing") : country.region}
            </p>
            <h2 className="mt-1 font-display text-4xl text-cream sm:text-5xl">
              {name}
            </h2>
          </div>
          <div
            aria-hidden="true"
            className={[
              "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-cream/15 text-5xl backdrop-blur-sm sm:size-20 sm:text-6xl",
              spinning ? "animate-pulse" : "",
            ].join(" ")}
          >
            {flag}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:gap-6 sm:p-8">
        <div className="min-w-0">
          {!spinning ? (
            <div className="max-w-2xl space-y-3">
              <p className="text-base text-ink-soft sm:text-lg">{description}</p>
              {country.wikipedia ? (
                <p className="text-sm text-ink-soft">
                  <a
                    href={country.wikipedia.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-tomato underline-offset-2 hover:underline"
                  >
                    {t("country.card.wikipediaLink", {
                      title: country.wikipedia.title,
                    })}
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-base text-ink-soft sm:text-lg">
              {t("country.card.spinningPlate")}
            </p>
          )}
        </div>

        <div className="justify-self-start sm:justify-self-end">
          <SpinSpoonButton spinning={spinning} onClick={onSpin} size="tile" />
        </div>
      </div>
    </article>
  );
}
