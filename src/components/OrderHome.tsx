import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Plus } from "lucide-react";
import type { Country, OrderPlatform } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { useConsent } from "@/consent/ConsentContext";
import { usePublicConfig } from "@/lib/usePublicConfig";
import { getOrderOptions } from "@/content/countries/menuAccessors";
import {
  deliveryPlatformLinks,
  resolveOrderOptionHref,
} from "@/restaurants/deliveryLinks";
import { platformLogoSrc } from "@/restaurants/platformLogos";
import {
  DEFAULT_DINE_CITY,
  getRememberCityPreference,
  getSavedDineCity,
  getSavedDineCoords,
  saveDineLocation,
  setRememberCityPreference,
} from "@/restaurants/locationPreference";
import { dineBannerUrl } from "@/content/countries/cuisineImages";
import { SuggestModal } from "@/components/SuggestModal";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { AdminOrderMenu } from "@/components/AdminOrderMenu";
import { DineLocationControl } from "@/components/DineLocationControl";
import {
  SuggestedItemReview,
  reviewTargetFromSuggestion,
  type SuggestReviewTarget,
} from "@/components/SuggestedItemReview";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import {
  handleOrderOptionAdminAction,
  useAdminItemBusy,
} from "@/admin/itemActions";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type OrderHomeProps = {
  country: Country;
  onCountryUpdated?: (country: Country) => void;
};

export function OrderHome({ country, onCountryUpdated }: OrderHomeProps) {
  const t = useT();
  const { marketingAllowed } = useConsent();
  const publicConfig = usePublicConfig();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const { openSelectImage } = useSelectImage();
  const savedCity = getSavedDineCity();
  const rememberPreferred = getRememberCityPreference();

  const [cityOrPostcode, setCityOrPostcode] = useState(
    savedCity ?? DEFAULT_DINE_CITY,
  );
  const [rememberCity, setRememberCity] = useState(rememberPreferred);
  const [editingLocation, setEditingLocation] = useState(
    !rememberPreferred || !savedCity,
  );
  const [visitorLocation, setVisitorLocation] = useState<
    { lat: number; lng: number } | undefined
  >(() => getSavedDineCoords());
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<SuggestReviewTarget | null>(
    null,
  );

  function onRememberChange(next: boolean) {
    setRememberCity(next);
    setRememberCityPreference(next);
    if (next) {
      const city = cityOrPostcode.trim();
      if (city) saveDineLocation(city, visitorLocation);
    }
  }

  function onCityChange(next: string) {
    setCityOrPostcode(next);
    setVisitorLocation(undefined);
  }

  function confirmLocation() {
    const city = cityOrPostcode.trim();
    setLocationError(null);
    if (!city) {
      setLocationError(t("dine.locationRequired"));
      return;
    }
    if (rememberCity) {
      saveDineLocation(city, visitorLocation);
    }
    setEditingLocation(false);
  }

  function useMyLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t("dine.locationUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setVisitorLocation(next);
        const city = cityOrPostcode.trim() || DEFAULT_DINE_CITY;
        setCityOrPostcode(city);
        if (rememberCity) {
          saveDineLocation(city, next);
        }
        setEditingLocation(false);
      },
      () => {
        setLocationError(t("dine.locationDenied"));
      },
    );
  }

  const showLocationForm = editingLocation || !rememberCity;
  const bannerUrl = dineBannerUrl(country);
  const orderOptions = useMemo(() => getOrderOptions(country), [country]);
  const filteredOrderOptions = useMemo(() => {
    const needle = cityOrPostcode.trim().toLowerCase();
    if (!needle || /^\d{4}/.test(needle)) return orderOptions;
    const matched = orderOptions.filter((option) =>
      option.city?.toLowerCase().includes(needle),
    );
    return matched.length > 0 ? matched : orderOptions;
  }, [orderOptions, cityOrPostcode]);
  const orderLinks = useMemo(
    () =>
      deliveryPlatformLinks({
        countryCode: country.code,
        countryName: country.name,
        cityOrPostcode,
        marketingAllowed,
      }),
    [
      country.code,
      country.name,
      cityOrPostcode,
      marketingAllowed,
      publicConfig.awinPublisherId,
      publicConfig.awinThuisbezorgdMid,
    ],
  );

  return (
    <section aria-labelledby="order-heading" className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem]">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <div className="h-40 w-full sm:h-52">
            <MediaPlaceholder
              labelKey="media.placeholder.country"
              tone="dark"
            />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/20"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="order-heading"
                className="font-display text-3xl text-ochre sm:text-5xl"
              >
                {t("order.heading")}
              </h2>
              <p className="mt-2 max-w-lg text-cream/85">
                {t("order.subtitle", { name: country.name })}
              </p>
            </div>
            {isAdmin && onCountryUpdated ? (
              <AdminOrderMenu
                country={country}
                cityOrPostcode={cityOrPostcode}
                onCountryUpdated={onCountryUpdated}
                tone="dark"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSuggestOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("dine.suggestOrder")}
        </button>
      </div>

      <DineLocationControl
        cityOrPostcode={cityOrPostcode}
        onCityChange={onCityChange}
        rememberCity={rememberCity}
        onRememberChange={onRememberChange}
        showForm={showLocationForm}
        onEdit={() => setEditingLocation(true)}
        onSubmit={confirmLocation}
        onUseMyLocation={useMyLocation}
        locationError={locationError}
        summaryKey="dine.orderingNear"
        submitKey="dine.setLocation"
      />

      <div className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10 sm:p-6">
        <h3 className="font-display text-2xl text-burgundy">
          {t("dine.order.heading")}
        </h3>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {t("dine.order.subtitle", { name: country.name })}
        </p>
        <p className="mt-3 text-sm text-ink-soft">{t("dine.order.note")}</p>
      </div>

      {filteredOrderOptions.length > 0 ? (
        <ul className="grid gap-3">
          {filteredOrderOptions.map((option) => (
            <li
              key={option.id}
              className="relative overflow-hidden rounded-2xl bg-cream ring-1 ring-ink/10"
            >
              {isAdmin && onCountryUpdated ? (
                <AdminItemMenu
                  className="absolute right-3 top-3 z-10"
                  label={option.name}
                  busy={Boolean(busy[`order:${option.id}`])}
                  status={status[`order:${option.id}`]}
                  error={error[`order:${option.id}`]}
                  onAction={(action) => {
                    void run(`order:${option.id}`, () =>
                      handleOrderOptionAdminAction({
                        action,
                        country,
                        option,
                        onCountryUpdated,
                        openSelectImage,
                      }),
                    );
                  }}
                />
              ) : null}
              <div
                className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch ${
                  isAdmin && onCountryUpdated ? "pr-12" : ""
                }`}
              >
                <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-40">
                  {option.imageUrl ? (
                    <img
                      src={option.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <MediaPlaceholder
                      labelKey="media.placeholder.recipe"
                      className="h-full min-h-36"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
                      <img
                        src={platformLogoSrc(option.platform as OrderPlatform)}
                        alt=""
                        className="size-5 rounded-md object-cover"
                      />
                      {t(`dine.order.platform.${option.platform}`)}
                    </p>
                    <p className="mt-1 font-display text-xl text-burgundy">
                      {option.name}
                    </p>
                    {option.signatureDish ? (
                      <p className="mt-1 text-sm font-semibold text-tomato">
                        {t("dine.order.signatureDish", {
                          dish: option.signatureDish,
                        })}
                      </p>
                    ) : null}
                    {option.city ? (
                      <p className="mt-1 inline-flex items-start gap-2 text-sm text-ink-soft">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0"
                        />
                        {option.city}
                      </p>
                    ) : null}
                    {option.notes ? (
                      <p className="mt-2 text-sm text-ink-soft">{option.notes}</p>
                    ) : null}
                  </div>
                  <a
                    href={resolveOrderOptionHref({
                      platform: option.platform,
                      url: option.url,
                      countryCode: country.code,
                      countryName: country.name,
                      cityOrPostcode: option.city || cityOrPostcode,
                      marketingAllowed,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
                  >
                    {t("dine.order.open")}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-stamp/40 bg-white/50 p-5">
          <p className="text-ink">
            {t("dine.order.empty", { name: country.name })}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-stamp">
          {t("dine.order.browsePlatforms")}
        </h4>
        <ul className="grid gap-3 sm:grid-cols-2">
          {orderLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-ink/10 bg-cream p-4 transition hover:border-tomato/40"
              >
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-xl text-burgundy">
                    <img
                      src={platformLogoSrc(link.id)}
                      alt=""
                      className="size-8 rounded-lg object-cover"
                    />
                    {t(`dine.order.${link.id}.title`)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t(`dine.order.${link.id}.hint`, {
                      name: country.name,
                      query: link.searchLabel,
                    })}
                  </p>
                </div>
                <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-ink/15 px-3 text-sm font-semibold text-ink">
                  {t(`dine.order.${link.id}.cta`)}
                  <ExternalLink aria-hidden="true" className="size-4" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <SuggestModal
        kind="restaurant"
        country={country}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onAdded={(result) => {
          if (result.kind === "restaurant") {
            setReviewTarget(
              reviewTargetFromSuggestion({
                kind: "restaurant",
                countryCode: country.code,
                restaurant: result.restaurant,
              }),
            );
          }
        }}
      />
      <SuggestedItemReview
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
      />
    </section>
  );
}
