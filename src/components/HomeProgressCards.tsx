import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useT } from "@/i18n/LocaleContext";
import { fetchMyTagSummary } from "@/tags/client";
import { levelArtSrc, resolveLevelProgress } from "@/tags/levels";
import type { TagSummary } from "@/tags/types";

function countKey(
  base: string,
  items: number,
  countries: number,
): string {
  if (items === 1 && countries === 1) return `${base}.oneEach`;
  if (items === 1) return `${base}.one`;
  if (countries === 1) return `${base}.oneCountry`;
  return base;
}

export function HomeProgressCards() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<TagSummary | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    void fetchMyTagSummary()
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (!user || !summary) return null;

  const dishes = summary.dishesDigested ?? 0;
  const countriesTasted = summary.countriesTasted;
  const plannedItems = summary.counts.want;
  const countriesPlanned = summary.countriesPlanned;
  const showDigested = dishes > 0 || countriesTasted > 0;
  const showPlanned = plannedItems > 0 || countriesPlanned > 0;
  if (!showDigested && !showPlanned) return null;

  const progress = resolveLevelProgress(countriesTasted);
  const levelTitle = progress.current
    ? t(progress.current.titleKey)
    : t("levels.none");

  return (
    <section
      aria-label={t("home.progress.aria")}
      className="mx-auto w-full max-w-5xl px-4 pt-2 sm:px-6"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {showDigested ? (
          <li>
            <Link
              to="/profile"
              className="flex h-full gap-4 rounded-[1.75rem] border border-ink/10 bg-cream p-5 shadow-sm transition hover:border-tomato/40 hover:shadow-md sm:p-6"
            >
              <img
                src={levelArtSrc(progress.current?.id ?? "none")}
                alt=""
                width={80}
                height={80}
                className="size-20 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                  {t("app.profile")}
                </p>
                <h2 className="mt-1 font-display text-2xl text-burgundy">
                  {progress.levelNumber > 0
                    ? t("profile.levelHeading", {
                        level: progress.levelNumber,
                        title: levelTitle,
                      })
                    : levelTitle}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {t(countKey("home.progress.digested", dishes, countriesTasted), {
                    dishes,
                    countries: countriesTasted,
                  })}
                </p>
              </div>
            </Link>
          </li>
        ) : null}

        {showPlanned ? (
          <li>
            <Link
              to="/planned"
              className="flex h-full flex-col justify-center rounded-[1.75rem] border border-ink/10 bg-cream p-5 shadow-sm transition hover:border-tomato/40 hover:shadow-md sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                {t("app.planned")}
              </p>
              <h2 className="mt-1 font-display text-2xl text-burgundy">
                {t("home.progress.plannedTitle")}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                {t(
                  countKey(
                    "home.progress.planned",
                    plannedItems,
                    countriesPlanned,
                  ),
                  {
                    items: plannedItems,
                    countries: countriesPlanned,
                  },
                )}
              </p>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
