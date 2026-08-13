import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ShoppingBag, Store } from "lucide-react";
import type { Country } from "@/types/content";
import {
  AdminDiscoverModal,
  type AdminDiscoverKind,
} from "@/components/AdminDiscoverModal";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { usePortalMenu } from "@/lib/usePortalMenu";

type AdminDineMenuProps = {
  country: Country;
  /** Current “Search near …” city — used when finding order options. */
  cityOrPostcode?: string;
  onCountryUpdated: (country: Country) => void;
  onRestaurantsAdded: () => void;
  tone?: "light" | "dark";
};

type DineDiscoverKind = Extract<
  AdminDiscoverKind,
  "restaurants" | "orderOptions"
>;

/** Dine-mode admin tools: find restaurants or order options. */
export function AdminDineMenu({
  country,
  cityOrPostcode,
  onCountryUpdated,
  onRestaurantsAdded,
  tone = "light",
}: AdminDineMenuProps) {
  const t = useT();
  const menuId = useId();
  const { open, setOpen, rootRef, triggerRef, panelRef, position } =
    usePortalMenu({ estimatedHeight: 160 });
  const [discoverKind, setDiscoverKind] = useState<DineDiscoverKind | null>(
    null,
  );

  function openDiscover(kind: DineDiscoverKind) {
    setOpen(false);
    setDiscoverKind(kind);
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
              onClick={() => openDiscover("restaurants")}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
            >
              <Store className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.dine.findRestaurants")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.dine.findRestaurants.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDiscover("orderOptions")}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <ShoppingBag className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.dine.findOrderOptions")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.dine.findOrderOptions.hint")}
                </span>
              </span>
            </button>
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
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
          tone === "dark"
            ? "bg-cream/15 text-cream ring-1 ring-cream/30 hover:bg-cream/25"
            : "border border-ink/15 bg-ink text-cream hover:bg-ink/90"
        }`}
      >
        {t("admin.dine.menu")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menu}

      {discoverKind ? (
        <AdminDiscoverModal
          kind={discoverKind}
          country={country}
          open
          defaultCity={cityOrPostcode}
          onClose={() => setDiscoverKind(null)}
          onCountryUpdated={onCountryUpdated}
          onRestaurantsAdded={
            discoverKind === "restaurants" ? onRestaurantsAdded : undefined
          }
        />
      ) : null}
    </div>
  );
}
