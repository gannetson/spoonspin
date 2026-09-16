import { ExternalLink } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import {
  fetchReservationOptions,
  recordReservationClick,
} from "@/restaurants/client";
import {
  bookingActionLabelKey,
  resolvePrimaryBookingOption,
  secondaryBookingLinks,
  type BookingOptionDto,
  type ReservationOptionsDto,
  type ReservationProviderKey,
} from "@/restaurants/reservationOptions";
import { useT } from "@/i18n/LocaleContext";

type RestaurantBookingActionsProps = {
  restaurantId: string;
  /** Local fallbacks while options load / on error. */
  website?: string;
  mapsUrl: string;
  isAdmin?: boolean;
};

function isProviderKey(
  value: BookingOptionDto["provider"],
): value is ReservationProviderKey {
  return value === "zenchef" || value === "guestplan" || value === "thefork";
}

function buttonClass(primary: boolean): string {
  return primary
    ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
    : "inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato";
}

export function RestaurantBookingActions({
  restaurantId,
  website,
  mapsUrl,
  isAdmin = false,
}: RestaurantBookingActionsProps) {
  const t = useT();
  const [options, setOptions] = useState<ReservationOptionsDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchReservationOptions(restaurantId)
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const localFallback: BookingOptionDto = website?.trim()
    ? { provider: "website", action: "VISIT_WEBSITE", url: website.trim() }
    : { provider: "maps", action: "VIEW_ON_MAP", url: mapsUrl };

  const primary = resolvePrimaryBookingOption(options) ?? localFallback;
  const secondary: BookingOptionDto[] = options
    ? [...secondaryBookingLinks(options, primary)]
    : [];
  // Always keep Maps discoverable unless it is already the primary CTA.
  if (primary.action !== "VIEW_ON_MAP" && !secondary.some((s) => s.action === "VIEW_ON_MAP")) {
    secondary.push({ provider: "maps", action: "VIEW_ON_MAP", url: mapsUrl });
  }

  function onBookingClick(event: MouseEvent<HTMLAnchorElement>, option: BookingOptionDto) {
    if (!isProviderKey(option.provider)) return;
    event.preventDefault();
    void recordReservationClick({
      restaurantId,
      provider: option.provider,
    }).finally(() => {
      window.open(option.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <a
          href={primary.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClass(true)}
          onClick={(event) => onBookingClick(event, primary)}
        >
          {t(bookingActionLabelKey(primary.action))}
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
        {secondary.map((option) => (
          <a
            key={`${option.provider}-${option.url}`}
            href={option.url}
            target="_blank"
            rel="noreferrer"
            className={buttonClass(false)}
            onClick={(event) => onBookingClick(event, option)}
          >
            {t(bookingActionLabelKey(option.action))}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        ))}
      </div>

      {isAdmin && options ? (
        <details className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink">
            {t("restaurant.booking.adminProviders")}
          </summary>
          <ul className="mt-3 space-y-2">
            {options.providers.map((provider) => (
              <li key={provider.key} className="font-mono text-xs">
                <span className="font-sans font-semibold text-ink">{provider.key}</span>
                {" · "}
                {provider.enabled ? "enabled" : "off"}
                {" · "}
                {provider.configured ? "configured" : "not configured"}
                {" · "}
                {provider.match_status}
                {provider.external_restaurant_id
                  ? ` · id ${provider.external_restaurant_id}`
                  : ""}
                {provider.verified ? " · verified" : ""}
              </li>
            ))}
            <li className="font-mono text-xs text-ink-soft/80">
              place fallback: {options.fallback.action} → {options.fallback.url}
            </li>
          </ul>
        </details>
      ) : null}
    </div>
  );
}
