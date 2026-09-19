import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
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
import { normalizeTheForkBookingUrl, parseTheForkRestaurantId, isPlausibleTheForkRestaurantId } from "@/restaurants/reviewLinks";
import { usePublicConfig } from "@/lib/usePublicConfig";
import { useT } from "@/i18n/LocaleContext";

type RestaurantBookingActionsProps = {
  restaurantId: string;
  /** Local fallbacks while options load / on error. */
  website?: string;
  mapsUrl: string;
  /** Stored TheFork profile URL — used immediately on cards (no extra fetch). */
  theForkUrl?: string;
  /** Compact Dine-card CTAs (no date/party picker, no reservation-options fetch). */
  compact?: boolean;
  isAdmin?: boolean;
};

function isProviderKey(
  value: BookingOptionDto["provider"],
): value is ReservationProviderKey {
  return value === "zenchef" || value === "guestplan" || value === "thefork";
}

function localDateISO(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buttonClass(primary: boolean, compact: boolean): string {
  if (compact) {
    return primary
      ? "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-tomato px-3.5 text-sm font-semibold text-cream hover:bg-tomato-deep"
      : "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato";
  }
  return primary
    ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
    : "inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato";
}

function optionFromTheForkUrl(url: string | undefined): BookingOptionDto | null {
  const canonical = url ? normalizeTheForkBookingUrl(url) : null;
  const id = canonical ? parseTheForkRestaurantId(canonical) : null;
  if (!canonical || !id || !isPlausibleTheForkRestaurantId(id)) return null;
  return { provider: "thefork", action: "BOOK_EXTERNALLY", url: canonical };
}

export function RestaurantBookingActions({
  restaurantId,
  website,
  mapsUrl,
  theForkUrl,
  compact = false,
  isAdmin = false,
}: RestaurantBookingActionsProps) {
  const t = useT();
  const { reservationsEnabled } = usePublicConfig();
  const [options, setOptions] = useState<ReservationOptionsDto | null>(null);
  const [date, setDate] = useState(localDateISO);
  const [time, setTime] = useState("19:30");
  const [partySize, setPartySize] = useState(2);

  useEffect(() => {
    if (compact) return;
    let cancelled = false;
    const query =
      reservationsEnabled && date && partySize
        ? { date, time, partySize }
        : {};
    void fetchReservationOptions(restaurantId, query)
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, compact, reservationsEnabled, date, time, partySize]);

  const localFallback: BookingOptionDto = website?.trim()
    ? { provider: "website", action: "VISIT_WEBSITE", url: website.trim() }
    : { provider: "maps", action: "VIEW_ON_MAP", url: mapsUrl };

  const ratingsTheFork = optionFromTheForkUrl(theForkUrl);
  const fetchedPrimary = resolvePrimaryBookingOption(options);
  const primary: BookingOptionDto =
    fetchedPrimary &&
    (fetchedPrimary.action === "RESERVE" || fetchedPrimary.action === "BOOK_EXTERNALLY")
      ? fetchedPrimary
      : (ratingsTheFork ?? fetchedPrimary ?? localFallback);

  const secondary: BookingOptionDto[] = [];
  if (options) {
    secondary.push(...secondaryBookingLinks(options, primary));
  }
  if (
    website?.trim() &&
    primary.action !== "VISIT_WEBSITE" &&
    !secondary.some((item) => item.action === "VISIT_WEBSITE")
  ) {
    secondary.push({
      provider: "website",
      action: "VISIT_WEBSITE",
      url: website.trim(),
    });
  }
  if (
    primary.action !== "VIEW_ON_MAP" &&
    !secondary.some((item) => item.action === "VIEW_ON_MAP")
  ) {
    secondary.push({ provider: "maps", action: "VIEW_ON_MAP", url: mapsUrl });
  }

  const liveTimes = useMemo(() => {
    if (!options) return [];
    const seen = new Set<string>();
    const out: BookingOptionDto[] = [];
    for (const opt of [options.best_option, ...options.alternatives]) {
      if (!opt?.time || opt.action !== "RESERVE" || !opt.url || seen.has(opt.time)) {
        continue;
      }
      seen.add(opt.time);
      out.push(opt);
    }
    return out;
  }, [options]);

  function onBookingClick(event: MouseEvent<HTMLAnchorElement>, option: BookingOptionDto) {
    if (!isProviderKey(option.provider)) return;
    event.preventDefault();
    event.stopPropagation();
    void recordReservationClick({
      restaurantId,
      provider: option.provider,
      partySize: reservationsEnabled ? partySize : undefined,
      requestedDate: reservationsEnabled ? date : undefined,
      requestedTime: option.time ?? (reservationsEnabled ? time : undefined),
    }).finally(() => {
      window.open(option.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className={compact ? "contents" : "space-y-3"}>
      {!compact && reservationsEnabled ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-semibold text-ink-soft">
            {t("restaurant.booking.date")}
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 rounded-full border border-ink/15 bg-white px-3 text-sm font-semibold text-ink"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink-soft">
            {t("restaurant.booking.time")}
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="min-h-11 rounded-full border border-ink/15 bg-white px-3 text-sm font-semibold text-ink"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink-soft">
            {t("restaurant.booking.partySize")}
            <select
              value={partySize}
              onChange={(event) => setPartySize(Number(event.target.value))}
              className="min-h-11 rounded-full border border-ink/15 bg-white px-3 text-sm font-semibold text-ink"
            >
              {Array.from({ length: 8 }, (_, index) => index + 1).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {liveTimes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
            {t("restaurant.booking.availableTimes")}
          </p>
          <div className="flex flex-wrap gap-2">
            {liveTimes.map((option) => (
              <a
                key={`${option.provider}-${option.time}-${option.url}`}
                href={option.url}
                target="_blank"
                rel="noreferrer"
                className={buttonClass(option.url === primary.url, compact)}
                onClick={(event) => onBookingClick(event, option)}
              >
                {option.time}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className={compact ? "contents" : "flex flex-wrap gap-2 sm:gap-3"}>
        <a
          href={primary.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClass(true, compact)}
          onClick={(event) => onBookingClick(event, primary)}
        >
          {t(bookingActionLabelKey(primary.action))}
          <ExternalLink aria-hidden="true" className={compact ? "size-3.5" : "size-4"} />
        </a>
        {secondary
          .filter((option) => option.url !== primary.url)
          .map((option) => (
          <a
            key={`${option.provider}-${option.url}`}
            href={option.url}
            target="_blank"
            rel="noreferrer"
            className={buttonClass(false, compact)}
            onClick={(event) => onBookingClick(event, option)}
          >
            {t(bookingActionLabelKey(option.action))}
            <ExternalLink aria-hidden="true" className={compact ? "size-3.5" : "size-4"} />
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
