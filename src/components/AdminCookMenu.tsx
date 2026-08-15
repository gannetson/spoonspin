import { useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  GlassWater,
  LayoutGrid,
  LoaderCircle,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import type { Country } from "@/types/content";
import { composeDinner } from "@/admin/countryTools";
import {
  AdminDiscoverModal,
  type AdminDiscoverKind,
} from "@/components/AdminDiscoverModal";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { useAnchoredToast, usePortalMenu } from "@/lib/usePortalMenu";

type AdminCookMenuProps = {
  country: Country;
  onCountryUpdated: (country: Country) => void;
  tone?: "light" | "dark";
};

type CookDiscoverKind = Exclude<AdminDiscoverKind, "restaurants" | "orderOptions">;

/** Cook-mode admin tools: recipes, dinner, drinks, shops. */
export function AdminCookMenu({
  country,
  onCountryUpdated,
  tone = "dark",
}: AdminCookMenuProps) {
  const t = useT();
  const menuId = useId();
  const { open, setOpen, rootRef, triggerRef, panelRef, position } = usePortalMenu({
    estimatedHeight: 280,
  });
  const [discoverKind, setDiscoverKind] = useState<CookDiscoverKind | null>(null);
  const [dinnerBusy, setDinnerBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { position: statusPosition } = useAnchoredToast({
    active: Boolean(dinnerBusy || status || error),
    triggerRef,
    width: 256,
  });

  async function onComposeDinner() {
    setOpen(false);
    setDinnerBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await composeDinner(country.code);
      onCountryUpdated(result.country);
      setStatus(t("admin.country.dinnerComposed", { title: result.dinner.title }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.country.dinnerError"));
    } finally {
      setDinnerBusy(false);
    }
  }

  function openDiscover(kind: CookDiscoverKind) {
    setOpen(false);
    setDiscoverKind(kind);
    setError(null);
    setStatus(null);
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className={`fixed ${zClass.popover} w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-xl`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openDiscover("recipes")}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
            >
              <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.findRecipes")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.findRecipes.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={dinnerBusy}
              onClick={() => void onComposeDinner()}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment disabled:opacity-60"
            >
              <LayoutGrid className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.composeDinner")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.composeDinner.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDiscover("drinks")}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <GlassWater className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.findDrinks")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.findDrinks.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDiscover("shops")}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <Warehouse className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.findShops")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.findShops.hint")}
                </span>
              </span>
            </button>
          </div>,
          document.body,
        )
      : null;

  const statusToast =
    (dinnerBusy || status || error) && statusPosition
      ? createPortal(
          <div
            style={{ top: statusPosition.top, left: statusPosition.left }}
            className={`fixed ${zClass.popover} w-max max-w-[16rem] rounded-lg border border-ink/10 bg-cream px-3 py-2 text-sm text-ink shadow-md`}
          >
            {dinnerBusy ? (
              <span className="inline-flex items-center gap-2 text-ink-soft">
                <LoaderCircle className="size-4 animate-spin" />
                {t("admin.country.composingDinner")}
              </span>
            ) : null}
            {status ? (
              <span role="status" className="text-ink-soft">
                {status}
              </span>
            ) : null}
            {error ? (
              <span role="alert" className="text-tomato">
                {error}
              </span>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
          tone === "dark"
            ? "bg-cream/15 text-cream ring-1 ring-cream/30 hover:bg-cream/25"
            : "bg-ink text-cream"
        }`}
      >
        {t("admin.cook.menu")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menu}
      {statusToast}

      {discoverKind ? (
        <AdminDiscoverModal
          kind={discoverKind}
          country={country}
          open
          onClose={() => setDiscoverKind(null)}
          onCountryUpdated={onCountryUpdated}
        />
      ) : null}
    </div>
  );
}
