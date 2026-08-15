import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import type { Country, SpecialtyShop } from "@/types/content";
import { useAuth } from "@/auth/AuthContext";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { handleShopAdminAction, useAdminItemBusy } from "@/admin/itemActions";
import { useT } from "@/i18n/LocaleContext";

type ShopViewProps = {
  country: Country;
  shop: SpecialtyShop;
  community?: boolean;
  onCountryUpdated: (country: Country) => void;
  onBack: () => void;
  onRemoved?: () => void;
};

export function ShopView({
  country,
  shop,
  community = false,
  onCountryUpdated,
  onBack,
  onRemoved,
}: ShopViewProps) {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { busy, status, error, run } = useAdminItemBusy();
  const adminKey = `shop:${shop.id}`;
  const hasWebsite = Boolean(shop.website?.trim());

  return (
    <article
      aria-labelledby="shop-heading"
      className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream shadow-sm"
    >
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("shop.backToList")}
          </button>
          {isAdmin ? (
            <AdminItemMenu
              label={shop.name}
              showReplaceImage={false}
              busy={Boolean(busy[adminKey])}
              status={status[adminKey]}
              error={error[adminKey]}
              onAction={(action) => {
                void run(adminKey, async () => {
                  const message = await handleShopAdminAction({
                    action,
                    country,
                    shop,
                    onCountryUpdated,
                  });
                  if (action === "remove") onRemoved?.();
                  return message;
                });
              }}
            />
          ) : null}
        </div>

        <header className="mt-5 space-y-1.5">
          {community ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stamp">
              {t("cook.communitySuggestion")}
            </p>
          ) : null}
          <h2
            id="shop-heading"
            className="font-display text-4xl text-burgundy sm:text-5xl"
          >
            {shop.name}
          </h2>
          <p className="flex items-start gap-1.5 text-ink-soft">
            <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <span>
              {shop.address}
              {shop.city ? ` · ${shop.city}` : ""}
            </span>
          </p>
        </header>

        <p className="mt-4 text-lg font-semibold text-ink">{shop.specialty}</p>
        {shop.notes ? <p className="mt-2 max-w-2xl text-ink-soft">{shop.notes}</p> : null}

        <ItemTagBar
          className="mt-5"
          entityType="shop"
          entityId={shop.id}
          entityName={shop.name}
          countryCode={country.code}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {hasWebsite ? (
            <a
              href={shop.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
            >
              {t("cook.shops.website")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          <a
            href={shop.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={
              hasWebsite
                ? "inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
                : "inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-4 text-sm font-semibold text-cream hover:bg-tomato-deep"
            }
          >
            {t("cook.shops.openInMaps")}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
