import { useMemo } from "react";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import type { Country, OrderOption } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { useConsent } from "@/consent/ConsentContext";
import { cuisineFlagsFor } from "@/restaurants/cuisineFlags";
import {
  orderOptionCuisineCodes,
  orderOptionPlatformLinks,
  resolveOrderPlatformHref,
} from "@/restaurants/orderOptionLinks";
import { platformLogoSrc } from "@/restaurants/platformLogos";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { handleOrderOptionAdminAction, useAdminItemBusy } from "@/admin/itemActions";
import { useEditOrderOption } from "@/admin/EditOrderOptionContext";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type OrderOptionViewProps = {
  country: Country;
  option: OrderOption;
  cityOrPostcode?: string;
  onBack: () => void;
  onCountryUpdated?: (country: Country) => void;
  onRemoved?: () => void;
};

export function OrderOptionView({
  country,
  option,
  cityOrPostcode,
  onBack,
  onCountryUpdated,
  onRemoved,
}: OrderOptionViewProps) {
  const t = useT();
  const { marketingAllowed } = useConsent();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const { openSelectImage } = useSelectImage();
  const { openEditOrderOption } = useEditOrderOption();
  const adminKey = `order:${option.id}`;

  const cuisineFlags = useMemo(
    () => cuisineFlagsFor(orderOptionCuisineCodes(option, country.code)),
    [option, country.code],
  );
  const links = useMemo(() => orderOptionPlatformLinks(option), [option]);
  const city = option.city || cityOrPostcode;

  return (
    <article className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem]">
        {option.imageUrl ? (
          <img
            src={option.imageUrl}
            alt=""
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : (
          <div className="h-56 w-full sm:h-72">
            <MediaPlaceholder labelKey="media.placeholder.recipe" tone="dark" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10"
        />
        {isAdmin && onCountryUpdated ? (
          <AdminItemMenu
            className="absolute right-4 top-4"
            label={option.name}
            tone="dark"
            showEditText
            editTextLabelKey="admin.item.editOrderOption"
            editTextHintKey="admin.item.editOrderOption.hint"
            busy={Boolean(busy[adminKey])}
            status={status[adminKey]}
            error={error[adminKey]}
            onAction={(action) => {
              void run(adminKey, () =>
                handleOrderOptionAdminAction({
                  action,
                  country,
                  option,
                  onCountryUpdated: (next) => {
                    onCountryUpdated(next);
                    if (
                      action === "remove" ||
                      !(next.orderOptions ?? []).some((item) => item.id === option.id)
                    ) {
                      onRemoved?.();
                    }
                  },
                  openSelectImage,
                  openEditOrderOption,
                }),
              );
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-cream/15 px-4 text-sm font-semibold text-cream backdrop-blur-sm hover:bg-cream/25"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("order.option.back")}
          </button>
          <div className="max-w-2xl pr-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ochre/90">
              {t("order.option.eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-4xl text-cream sm:text-5xl">
              {option.name}
            </h2>
            {option.signatureDish ? (
              <p className="mt-2 text-sm font-semibold text-ochre">
                {t("dine.order.signatureDish", { dish: option.signatureDish })}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[1.75rem] bg-cream p-5 ring-1 ring-ink/10 sm:p-8">
        {cuisineFlags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {cuisineFlags.map((flag) => (
              <li
                key={flag.code}
                className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-3 py-1 text-sm text-ink"
                title={flag.name}
              >
                <span aria-hidden="true">{flag.flag}</span>
                {flag.name}
              </li>
            ))}
          </ul>
        ) : null}

        {city ? (
          <p className="inline-flex items-start gap-2 text-ink-soft">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {city}
          </p>
        ) : null}

        {option.notes ? (
          <p className="max-w-2xl text-ink-soft">{option.notes}</p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          {links.thuisbezorgd ? (
            <a
              href={resolveOrderPlatformHref({
                platform: "thuisbezorgd",
                url: links.thuisbezorgd,
                countryCode: country.code,
                countryName: country.name,
                cityOrPostcode: city,
                marketingAllowed,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
            >
              <img
                src={platformLogoSrc("thuisbezorgd")}
                alt=""
                className="size-5 rounded-md object-cover"
              />
              {t("order.option.open.thuisbezorgd")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          {links.ubereats ? (
            <a
              href={resolveOrderPlatformHref({
                platform: "ubereats",
                url: links.ubereats,
                countryCode: country.code,
                countryName: country.name,
                cityOrPostcode: city,
                marketingAllowed,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
            >
              <img
                src={platformLogoSrc("ubereats")}
                alt=""
                className="size-5 rounded-md object-cover"
              />
              {t("order.option.open.ubereats")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          {!links.thuisbezorgd && !links.ubereats ? (
            <p className="text-sm text-ink-soft">{t("order.option.noLinks")}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
