import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import { fetchAdminUserProfile } from "@/admin/users";
import { countryCatalog } from "@/content/countries/catalog";
import { useT } from "@/i18n/LocaleContext";
import { fetchMyTagSummary, fetchMyTags } from "@/tags/client";
import { levelArtSrc, resolveLevelProgress } from "@/tags/levels";
import type { TagEntityType, TagSummary, UserTag } from "@/tags/types";

type TypeFilter = "all" | TagEntityType;

export type PlatePageVariant = "tasted" | "planned";

const catalogByCode = new Map(
  countryCatalog.map((entry) => [entry.code.toLowerCase(), entry]),
);

type ProfilePageProps = {
  /** tasted = Dishes digested (did only); planned = Planned plates (want only). */
  variant?: PlatePageVariant;
};

export function PlannedPlatesPage() {
  return <ProfilePage variant="planned" />;
}

export function ProfilePage({ variant = "tasted" }: ProfilePageProps) {
  const t = useT();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [tags, setTags] = useState<UserTag[]>([]);
  const [summary, setSummary] = useState<TagSummary | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [minRating, setMinRating] = useState<number | null>(null);

  const isPlanned = variant === "planned";
  const intent = isPlanned ? "want" : "did";

  const viewingOther =
    !isPlanned && Boolean(routeUserId) && Boolean(user) && routeUserId !== user?.id;
  const isOwnProfile = isPlanned || !routeUserId || routeUserId === user?.id;
  const canViewOther = user?.role === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      openAuth({ mode: "login" });
    }
  }, [authLoading, user, openAuth]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (viewingOther && !canViewOther) {
      setLoading(false);
      setError(t("profile.adminOnly"));
      setTags([]);
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTypeFilter("all");
    setCountryFilter("all");
    setMinRating(null);

    async function load() {
      try {
        if (viewingOther && routeUserId) {
          const data = await fetchAdminUserProfile(routeUserId);
          if (cancelled) return;
          setTags(data.tags.filter((tag) => tag.intent === "did"));
          setSummary(data.summary);
          setProfileName(data.user.name);
          setProfileEmail(data.user.email);
        } else {
          const [list, nextSummary] = await Promise.all([
            fetchMyTags({ intent }),
            fetchMyTagSummary(),
          ]);
          if (cancelled) return;
          setTags(list);
          setSummary(nextSummary);
          setProfileName(user!.name);
          setProfileEmail(user!.email);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : isPlanned
              ? t("planned.loading")
              : t("profile.loading"),
        );
        setTags([]);
        setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, routeUserId, viewingOther, canViewOther, intent, isPlanned, t]);

  const filtered = useMemo(() => {
    return tags.filter((tag) => {
      if (typeFilter !== "all" && tag.entityType !== typeFilter) return false;
      if (countryFilter !== "all" && tag.countryCode !== countryFilter.toLowerCase()) {
        return false;
      }
      if (!isPlanned && minRating != null) {
        if (tag.rating == null || tag.rating < minRating) return false;
      }
      return true;
    });
  }, [tags, typeFilter, countryFilter, minRating, isPlanned]);

  const countriesInTags = useMemo(() => {
    const codes = new Set(tags.map((tag) => tag.countryCode));
    return [...codes]
      .map((code) => catalogByCode.get(code))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const progress = resolveLevelProgress(summary?.countriesTasted ?? 0);
  const levelTitle = progress.current ? t(progress.current.titleKey) : t("levels.none");
  const nextTitle = progress.next ? t(progress.next.titleKey) : null;
  const levelArt = levelArtSrc(progress.current?.id ?? "none");
  const nextLevelNumber = progress.next ? progress.levelNumber + 1 : null;

  const plannedCountryCodes = summary?.plannedCountryCodes ?? [];
  const countriesPlanned = summary?.countriesPlanned ?? 0;

  const displayName =
    profileName?.trim() ||
    profileEmail ||
    (isOwnProfile
      ? isPlanned
        ? t("planned.title")
        : t("profile.title")
      : t("profile.unknownUser"));

  const pageTitle = isPlanned
    ? t("planned.title")
    : isOwnProfile
      ? t("profile.title")
      : t("profile.userTitle", { name: displayName });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-ink-soft">
        {isPlanned ? t("planned.loading") : t("profile.loading")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-parchment text-ink">
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-3xl">
            {isPlanned ? t("planned.title") : t("profile.title")}
          </h1>
          <p className="mt-3 text-ink-soft">
            {isPlanned ? t("planned.signInPrompt") : t("profile.signInPrompt")}
          </p>
          <button
            type="button"
            onClick={() => openAuth({ mode: "login" })}
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-tomato px-6 font-semibold text-cream"
          >
            {t("app.signIn")}
          </button>
          <div className="mt-6">
            <Link to="/" className="text-sm text-ink-soft underline">
              {t("login.backHome")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (viewingOther && !canViewOther) {
    return (
      <div className="min-h-screen bg-parchment text-ink">
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-3xl">{t("profile.title")}</h1>
          <p className="mt-3 text-ink-soft">{t("profile.adminOnly")}</p>
          <Link
            to="/profile"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-tomato px-6 font-semibold text-cream"
          >
            {t("profile.title")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <header className="border-b border-ink/10 bg-cream/80">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link
            to={viewingOther ? "/admin/users" : "/"}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold hover:border-tomato hover:text-tomato"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {viewingOther ? t("profile.backToUsers") : t("app.brand")}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {isPlanned ? t("planned.eyebrow") : t("profile.levelLabel")}
            </p>
            <h1 className="truncate font-display text-2xl">{pageTitle}</h1>
            {viewingOther && profileEmail ? (
              <p className="truncate text-sm text-ink-soft">{profileEmail}</p>
            ) : null}
          </div>
          {isOwnProfile ? (
            <Link
              to={isPlanned ? "/profile" : "/planned"}
              className="shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-sm font-semibold hover:border-tomato hover:text-tomato"
            >
              {isPlanned ? t("app.profile") : t("app.planned")}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        {isPlanned ? (
          <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stamp">
              {t("planned.eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl">
              {t("planned.countriesPlanned", {
                count: countriesPlanned,
              })}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{t("planned.subtitle")}</p>
            <p className="mt-4 text-sm text-ink-soft">
              {t("planned.notOnPassport")}{" "}
              <Link to="/profile" className="font-semibold text-tomato underline">
                {t("app.profile")}
              </Link>
              .
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <img
                src={levelArt}
                alt=""
                width={128}
                height={128}
                className="size-28 shrink-0 object-contain sm:size-32"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stamp">
                  {t("profile.levelLabel")}
                </p>
                <h2 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                  {progress.levelNumber > 0
                    ? t("profile.levelHeading", {
                        level: progress.levelNumber,
                        title: levelTitle,
                      })
                    : levelTitle}
                </h2>
                <p className="mt-2 text-base font-semibold text-ink">
                  {t("profile.countriesTasted", {
                    count: progress.countriesTasted,
                    total: progress.totalCountries,
                  })}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {isOwnProfile
                    ? t("profile.subtitle")
                    : t("profile.subtitleOther", { name: displayName })}
                </p>
                {isOwnProfile ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    {t("profile.plannedLinkHint")}{" "}
                    <Link to="/planned" className="font-semibold text-tomato underline">
                      {t("app.planned")}
                    </Link>
                    .
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-parchment">
                <div
                  className="h-full rounded-full bg-tomato transition-all"
                  style={{
                    width: `${Math.round(progress.progressToNext * 100)}%`,
                  }}
                />
              </div>
              {progress.next && nextTitle && nextLevelNumber != null ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={levelArtSrc(progress.next.id)}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 object-contain"
                  />
                  <p className="text-sm font-semibold text-ink">
                    {t("profile.nextLevel", {
                      level: nextLevelNumber,
                      title: nextTitle,
                      threshold: progress.next.threshold,
                    })}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-ink">
                  {t("profile.maxLevel")}
                </p>
              )}
            </div>
          </section>
        )}

        {(isPlanned ? plannedCountryCodes : (summary?.countryCodes ?? [])).length > 0 ? (
          <section>
            <h2 className="mb-3 font-display text-2xl">
              {isPlanned ? t("planned.countriesHeading") : t("profile.countriesHeading")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {(isPlanned ? plannedCountryCodes : (summary?.countryCodes ?? [])).map(
                (code) => {
                  const entry = catalogByCode.get(code);
                  if (!entry) return null;
                  return (
                    <li key={code}>
                      <Link
                        to={`/?country=${code}&mode=cook`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-semibold ring-1 ring-ink/10 hover:ring-tomato/40"
                      >
                        <span aria-hidden="true" className="flag-glow">
                          {entry.flag}
                        </span>
                        {entry.name}
                      </Link>
                    </li>
                  );
                },
              )}
            </ul>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="font-display text-2xl">
            {isPlanned ? t("planned.tagsHeading") : t("profile.tagsHeading")}
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterPills
              label={t("profile.filter.type")}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: t("profile.filter.all") },
                { value: "recipe", label: t("profile.filter.recipe") },
                { value: "drink", label: t("profile.filter.drink") },
                {
                  value: "restaurant",
                  label: t("profile.filter.restaurant"),
                },
                { value: "shop", label: t("profile.filter.shop") },
              ]}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("profile.filter.country")}
              </span>
              <select
                value={countryFilter}
                onChange={(event) => setCountryFilter(event.target.value)}
                className="rounded-full border border-burgundy/20 bg-cream px-3 py-1.5 text-sm font-semibold text-burgundy"
              >
                <option value="all">{t("profile.filter.countryAll")}</option>
                {countriesInTags.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.flag} {entry.name}
                  </option>
                ))}
              </select>
            </label>
            {!isPlanned ? (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("profile.filter.rating")}
                </span>
                <select
                  value={minRating == null ? "any" : String(minRating)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMinRating(value === "any" ? null : Number(value));
                  }}
                  className="rounded-full border border-burgundy/20 bg-cream px-3 py-1.5 text-sm font-semibold text-burgundy"
                >
                  <option value="any">{t("profile.filter.ratingAny")}</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {loading ? (
            <p className="text-ink-soft">
              {isPlanned ? t("planned.loading") : t("profile.loading")}
            </p>
          ) : error ? (
            <p className="font-semibold text-tomato" role="alert">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stamp/40 bg-cream/60 p-5 text-ink-soft">
              {isPlanned
                ? t("planned.empty")
                : isOwnProfile
                  ? t("profile.empty")
                  : t("profile.emptyOther", { name: displayName })}
            </p>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((tag) => {
                const country = catalogByCode.get(tag.countryCode);
                const href =
                  tag.entityType === "restaurant"
                    ? `/?country=${tag.countryCode}&mode=dine&restaurant=${encodeURIComponent(tag.entityId)}`
                    : tag.entityType === "recipe"
                      ? `/?country=${tag.countryCode}&mode=cook&recipe=${encodeURIComponent(tag.entityId)}`
                      : tag.entityType === "shop"
                        ? `/?country=${tag.countryCode}&mode=cook&shop=${encodeURIComponent(tag.entityId)}`
                        : `/?country=${tag.countryCode}&mode=cook`;
                return (
                  <li
                    key={tag.id}
                    className="rounded-2xl border border-ink/10 bg-cream p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
                          {country ? (
                            <>
                              <span aria-hidden="true" className="flag-glow">
                                {country.flag}
                              </span>{" "}
                              {country.name}
                            </>
                          ) : (
                            tag.countryCode.toUpperCase()
                          )}{" "}
                          · {t(`profile.filter.${tag.entityType}`)}
                          {!isPlanned ? (
                            <> · {t(`profile.filter.${tag.intent}`)}</>
                          ) : null}
                        </p>
                        <h3 className="mt-1 font-display text-xl">{tag.entityName}</h3>
                        {tag.intent === "did" && tag.rating != null ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-sm text-saffron">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`size-3.5 ${
                                  i < tag.rating! ? "fill-current" : "text-ink/20"
                                }`}
                                aria-hidden="true"
                              />
                            ))}
                            <span className="sr-only">{tag.rating} / 5</span>
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-ink-soft">
                          {tag.reviewText?.trim() || t("profile.noReview")}
                        </p>
                        {tag.photoUrls.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tag.photoUrls.map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt=""
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <Link
                        to={href}
                        className="shrink-0 rounded-full bg-tomato px-3 py-1.5 text-sm font-semibold text-cream hover:bg-tomato/90"
                      >
                        {t("profile.openItem")}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              value === option.value
                ? "bg-burgundy text-cream"
                : "bg-cream text-burgundy ring-1 ring-burgundy/15 hover:ring-tomato/40"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
