import { ExternalLink, MapPin, Star } from "lucide-react";
import type { Restaurant } from "@/restaurants/types";
import {
  formatPriceLevel,
  listReviewLinks,
  listSourceRatings,
  normalizeToFive,
} from "@/restaurants/ratings";
import { cuisineFlagsFor } from "@/restaurants/cuisineFlags";
import { formatDistanceKm } from "@/lib/haversine";
import { AdminItemMenu, type AdminItemAction } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { useT } from "@/i18n/LocaleContext";

type RestaurantCardProps = {
  restaurant: Restaurant;
  countryCode: string;
  onOpen: () => void;
  isAdmin?: boolean;
  adminBusy?: boolean;
  adminStatus?: string | null;
  adminError?: string | null;
  onAdminAction?: (action: AdminItemAction) => void;
};

export function RestaurantCard({
  restaurant,
  countryCode,
  onOpen,
  isAdmin = false,
  adminBusy = false,
  adminStatus = null,
  adminError = null,
  onAdminAction,
}: RestaurantCardProps) {
  const t = useT();
  const cuisineFlags = cuisineFlagsFor(restaurant.cuisineCodes);
  const priceLabel = formatPriceLevel(restaurant.priceLevel);
  const sourceRatings = listSourceRatings(restaurant.ratings).slice(0, 2);
  const reviewLinks = listReviewLinks(restaurant);
  const photoUrl = restaurant.photoUrl?.trim() || null;
  const hasWebsite = Boolean(restaurant.website?.trim());

  return (
    <li>
      <div className="group relative overflow-hidden rounded-2xl bg-cream text-ink ring-1 ring-ink/10 transition hover:ring-tomato/35">
        <div className="relative flex cursor-pointer">
          <button
            type="button"
            onClick={onOpen}
            aria-label={t("dine.openRestaurantAria", { name: restaurant.name })}
            className="relative h-32 w-28 shrink-0 cursor-pointer self-stretch sm:h-auto sm:w-40"
          >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <MediaPlaceholder
              labelKey="media.placeholder.restaurant"
              compact
              className="absolute inset-0"
            />
          )}
        </button>

        <div
          className={`flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 sm:px-5 ${
            isAdmin ? "pr-14" : ""
          }`}
        >
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 cursor-pointer space-y-1.5 text-left"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h3 className="font-display text-xl leading-tight text-ink transition group-hover:text-tomato sm:text-2xl">
                {restaurant.name}
              </h3>
              {restaurant.distanceKm != null ? (
                <p className="shrink-0 pt-1 text-sm font-semibold text-ink">
                  {t("dine.distanceAway", {
                    distance: formatDistanceKm(restaurant.distanceKm),
                  })}
                </p>
              ) : null}
            </div>

            <p className="flex items-start gap-1.5 text-sm text-ink-soft">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span className="line-clamp-1">
                {restaurant.address}
                {restaurant.city ? ` · ${restaurant.city}` : ""}
              </span>
            </p>

            {(cuisineFlags.length > 0 ||
              restaurant.authenticityRating != null ||
              restaurant.rating != null ||
              priceLabel ||
              sourceRatings.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {cuisineFlags.slice(0, 3).map((flag) => (
                  <span
                    key={flag.code}
                    className="inline-flex items-center gap-1 rounded-full bg-parchment px-2 py-0.5 text-xs font-semibold text-ink"
                    title={flag.name}
                  >
                    <span aria-hidden="true">{flag.flag}</span>
                    <span className="hidden sm:inline">{flag.name}</span>
                  </span>
                ))}
                {restaurant.authenticityRating != null ? (
                  <span
                    className="inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-cream"
                    title={t("dine.authenticityTitle")}
                  >
                    {t("dine.authenticityBadge", {
                      rating: restaurant.authenticityRating.toFixed(0),
                    })}
                  </span>
                ) : null}
                {restaurant.rating != null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-2 py-0.5 text-xs font-semibold text-ink">
                    <Star
                      aria-hidden="true"
                      className="size-3 text-saffron"
                    />
                    {restaurant.rating.toFixed(1)}
                  </span>
                ) : null}
                {priceLabel ? (
                  <span
                    className="inline-flex items-center rounded-full border border-ink/10 bg-white px-2 py-0.5 text-xs font-semibold text-ink"
                    title={t("dine.priceTitle")}
                  >
                    {priceLabel}
                  </span>
                ) : null}
                {sourceRatings.map((item) => (
                  <span
                    key={item.source}
                    className="inline-flex items-center rounded-full border border-ink/10 bg-white px-2 py-0.5 text-xs font-semibold text-ink-soft"
                    title={t("dine.sourceRatingTitle", { label: item.label })}
                  >
                    {item.label}{" "}
                    {item.rating.scale === 10
                      ? `${item.rating.score.toFixed(1)}/10`
                      : `${normalizeToFive(item.rating).toFixed(1)}`}
                  </span>
                ))}
              </div>
            )}

            {restaurant.authenticityNotes ? (
              <p className="line-clamp-2 text-sm text-ink-soft">
                {restaurant.authenticityNotes}
              </p>
            ) : null}
          </button>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {hasWebsite ? (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-tomato px-3.5 text-sm font-semibold text-cream hover:bg-tomato-deep"
              >
                {t("dine.website")}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : null}
            <a
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={
                hasWebsite
                  ? "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                  : "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-tomato px-3.5 text-sm font-semibold text-cream hover:bg-tomato-deep"
              }
            >
              {t("dine.openInGoogleMaps")}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
            {reviewLinks.map((link) => (
              <a
                key={link.source}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 text-sm font-semibold text-ink-soft hover:border-tomato hover:text-tomato"
              >
                {link.source === "google"
                  ? t("dine.reviews.google")
                  : link.source === "tripadvisor"
                    ? t("dine.reviews.tripadvisor")
                    : link.source === "theFork"
                      ? t("dine.reviews.theFork")
                      : t("dine.reviews.openTable")}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        </div>

        {isAdmin && onAdminAction ? (
          <AdminItemMenu
            className="absolute right-2 top-2"
            label={restaurant.name}
            showRestaurantResearch
            busy={adminBusy}
            status={adminStatus}
            error={adminError}
            onAction={onAdminAction}
          />
        ) : null}
        </div>
        <div className="border-t border-ink/10 px-4 py-2.5">
          <ItemTagBar
            entityType="restaurant"
            entityId={restaurant.id}
            entityName={restaurant.name}
            countryCode={countryCode}
            variant="compact"
          />
        </div>
      </div>
    </li>
  );
}
