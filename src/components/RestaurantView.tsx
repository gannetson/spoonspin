import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Star } from "lucide-react";
import type { Country } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import {
  cuisineFlagsFor,
  matchMenuItemNationalDishes,
} from "@/restaurants/cuisineFlags";
import {
  formatPriceLevel,
  listReviewLinks,
  listSourceRatings,
  normalizeToFive,
} from "@/restaurants/ratings";
import { fetchRestaurantById } from "@/restaurants/client";
import type {
  Restaurant,
  RestaurantMenuItem,
  RestaurantMenuItemCategory,
} from "@/restaurants/types";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import {
  handleRestaurantAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type RestaurantViewProps = {
  country: Country;
  restaurantId: string;
  /** Prefer list payload when already loaded. */
  initialRestaurant?: Restaurant | null;
  onBack: () => void;
  onUpdated?: (restaurant: Restaurant) => void;
  onRemoved?: (id: string) => void;
};

const MENU_ORDER: Array<RestaurantMenuItemCategory | "other"> = [
  "starter",
  "main",
  "side",
  "snack",
  "dessert",
  "drink",
  "other",
];

function groupMenu(items: RestaurantMenuItem[]) {
  const groups = new Map<RestaurantMenuItemCategory | "other", RestaurantMenuItem[]>();
  for (const item of items) {
    const key = item.category ?? "other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return MENU_ORDER.flatMap((key) => {
    const list = groups.get(key);
    if (!list?.length) return [];
    return [{ key, items: list }];
  });
}

export function RestaurantView({
  country,
  restaurantId,
  initialRestaurant = null,
  onBack,
  onUpdated,
  onRemoved,
}: RestaurantViewProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const { openSelectImage } = useSelectImage();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(
    initialRestaurant?.id === restaurantId ? initialRestaurant : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    !(initialRestaurant && initialRestaurant.id === restaurantId),
  );

  useEffect(() => {
    if (initialRestaurant?.id === restaurantId) {
      setRestaurant(initialRestaurant);
      setLoading(false);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchRestaurantById(restaurantId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setRestaurant(null);
          setLoadError(t("restaurant.notFound"));
          return;
        }
        setRestaurant(row);
      })
      .catch(() => {
        if (!cancelled) {
          setRestaurant(null);
          setLoadError(t("restaurant.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, initialRestaurant, t]);

  const cuisineFlags = useMemo(
    () => cuisineFlagsFor(restaurant?.cuisineCodes),
    [restaurant?.cuisineCodes],
  );
  const priceLabel = formatPriceLevel(restaurant?.priceLevel);
  const adminKey = restaurant ? `restaurant:${restaurant.id}` : "";
  const menuGroups = useMemo(
    () => groupMenu(restaurant?.menu ?? []),
    [restaurant?.menu],
  );

  if (loading) {
    return (
      <p role="status" className="text-sm text-ink-soft">
        {t("restaurant.loading")}
      </p>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("restaurant.backToResults")}
        </button>
        <p role="alert" className="text-tomato">
          {loadError ?? t("restaurant.notFound")}
        </p>
      </div>
    );
  }

  return (
    <article aria-labelledby="restaurant-heading" className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem]">
        {restaurant.photoUrl?.trim() ? (
          <img
            src={restaurant.photoUrl}
            alt=""
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : (
          <div className="h-56 w-full sm:h-72">
            <MediaPlaceholder
              labelKey="media.placeholder.restaurant"
              tone="dark"
            />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10"
        />
        {isAdmin ? (
          <AdminItemMenu
            className="absolute right-4 top-4"
            label={restaurant.name}
            tone="dark"
            showRestaurantResearch
            busy={Boolean(busy[adminKey])}
            status={status[adminKey]}
            error={error[adminKey]}
            onAction={(action) => {
              void run(adminKey, () =>
                handleRestaurantAdminAction({
                  action,
                  countryName: country.name,
                  countryCode: country.code,
                  restaurant,
                  openSelectImage,
                  onUpdated: (next) => {
                    setRestaurant(next);
                    onUpdated?.(next);
                  },
                  onRemoved: (id) => {
                    onRemoved?.(id);
                    onBack();
                  },
                }),
              );
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3 pr-14">
            <button
              type="button"
              onClick={onBack}
              className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-cream/15 px-4 text-sm font-semibold text-cream backdrop-blur-sm hover:bg-cream/25"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t("restaurant.backToResults")}
            </button>
          </div>

          <header className="pointer-events-auto max-w-3xl">
            {cuisineFlags.length > 0 ? (
              <p
                className="mb-2 flex flex-wrap items-center gap-2 text-sm text-cream/85"
                aria-label={t("restaurant.cuisinesAria")}
              >
                {cuisineFlags.map((flag) => (
                  <span
                    key={flag.code}
                    className="inline-flex items-center gap-1.5"
                    title={flag.name}
                  >
                    <span aria-hidden="true" className="flag-glow text-base leading-none">
                      {flag.flag}
                    </span>
                    {flag.name}
                  </span>
                ))}
              </p>
            ) : null}
            <h2
              id="restaurant-heading"
              className="font-display text-4xl leading-tight text-ochre sm:text-5xl"
            >
              {restaurant.name}
            </h2>
            <p className="mt-2 inline-flex items-start gap-2 text-cream/85">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {restaurant.address}
                {restaurant.city ? ` · ${restaurant.city}` : ""}
              </span>
            </p>
          </header>
        </div>
      </div>

      <ItemTagBar
        entityType="restaurant"
        entityId={restaurant.id}
        entityName={restaurant.name}
        countryCode={country.code}
      />

      <div className="space-y-6">
        {(restaurant.authenticityRating != null ||
          restaurant.rating != null ||
          priceLabel ||
          listSourceRatings(restaurant.ratings).length > 0) && (
          <div className="flex flex-wrap gap-2">
            {restaurant.authenticityRating != null ? (
              <p
                className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-cream"
                title={t("dine.authenticityTitle")}
              >
                {t("dine.authenticityBadge", {
                  rating: restaurant.authenticityRating.toFixed(0),
                })}
              </p>
            ) : null}
            {restaurant.rating != null ? (
              <p className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1 text-sm font-semibold">
                <Star aria-hidden="true" className="size-4 text-saffron" />
                {restaurant.rating.toFixed(1)}
                {restaurant.reviewCount != null
                  ? ` (${restaurant.reviewCount})`
                  : ""}
              </p>
            ) : null}
            {priceLabel ? (
              <p
                className="inline-flex items-center rounded-full border border-ink/15 bg-white px-3 py-1 text-sm font-semibold text-ink"
                title={t("restaurant.priceTitle")}
              >
                {priceLabel}
              </p>
            ) : null}
            {listSourceRatings(restaurant.ratings).map((item) => (
              <p
                key={item.source}
                className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-semibold text-ink"
                title={t("dine.sourceRatingTitle", { label: item.label })}
              >
                {item.label}{" "}
                {item.rating.scale === 10
                  ? `${item.rating.score.toFixed(1)}/10`
                  : `${normalizeToFive(item.rating).toFixed(1)}/5`}
                {item.rating.count != null ? ` · ${item.rating.count}` : ""}
              </p>
            ))}
          </div>
        )}

        {restaurant.authenticityNotes ? (
          <p className="max-w-2xl text-ink-soft">{restaurant.authenticityNotes}</p>
        ) : null}
        {restaurant.photoAttribution ? (
          <p className="text-xs text-ink-soft/80">{restaurant.photoAttribution}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {restaurant.website ? (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
            >
              {t("dine.website")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          <a
            href={restaurant.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={
              restaurant.website
                ? "inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                : "inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
            }
          >
            {t("dine.openInGoogleMaps")}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
          {listReviewLinks(restaurant).map((link) => (
            <a
              key={link.source}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 text-sm font-semibold text-ink-soft hover:border-tomato hover:text-tomato"
            >
              {link.source === "google"
                ? t("dine.reviews.google")
                : link.source === "tripadvisor"
                  ? t("dine.reviews.tripadvisor")
                  : link.source === "theFork"
                    ? t("dine.reviews.theFork")
                    : t("dine.reviews.openTable")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ))}
        </div>

        <section aria-labelledby="restaurant-menu-heading" className="space-y-4">
          <h3
            id="restaurant-menu-heading"
            className="font-display text-3xl text-burgundy"
          >
            {t("restaurant.menuHeading")}
          </h3>
          {menuGroups.length === 0 ? (
            <p className="text-sm text-ink-soft">
              {isAdmin
                ? t("restaurant.menuEmptyAdmin")
                : t("restaurant.menuEmpty")}
            </p>
          ) : (
            <div className="space-y-6">
              {menuGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                    {group.key === "other"
                      ? t("restaurant.menuOther")
                      : t(`restaurant.category.${group.key}`)}
                  </h4>
                  <ul className="grid gap-3">
                    {group.items.map((item) => {
                      const matches = matchMenuItemNationalDishes(
                        item,
                        restaurant.cuisineCodes,
                      );
                      return (
                        <li
                          key={item.id}
                          className="rounded-2xl bg-cream px-4 py-4 ring-1 ring-ink/10 sm:px-5"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <p className="flex flex-wrap items-center gap-2 font-display text-xl text-burgundy">
                                <span>{item.name}</span>
                                {matches.map((match) => (
                                  <span
                                    key={`${item.id}-${match.code}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink"
                                    title={
                                      match.isNationalDish
                                        ? t("restaurant.nationalDishMatch", {
                                            country: match.name,
                                            dish: match.dishName,
                                          })
                                        : t("restaurant.dishMatch", {
                                            country: match.name,
                                            dish: match.dishName,
                                          })
                                    }
                                  >
                                    <span aria-hidden="true" className="flag-glow text-sm leading-none">
                                      {match.flag}
                                    </span>
                                    {match.isNationalDish
                                      ? t("restaurant.nationalDishLabel")
                                      : match.name}
                                  </span>
                                ))}
                              </p>
                              {item.localName ? (
                                <p className="text-sm text-ink-soft">
                                  {item.localName}
                                </p>
                              ) : null}
                            </div>
                            {item.priceEur != null ? (
                              <p className="shrink-0 font-semibold text-ink">
                                €
                                {item.priceEur.toFixed(
                                  item.priceEur % 1 ? 2 : 0,
                                )}
                              </p>
                            ) : null}
                          </div>
                          {item.description ? (
                            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                              {item.description}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
