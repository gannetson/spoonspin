import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ShoppingBag } from "lucide-react";
import type { Country } from "@/types/content";
import { AdminDiscoverModal } from "@/components/AdminDiscoverModal";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { usePortalMenu } from "@/lib/usePortalMenu";

type AdminOrderMenuProps = {
  country: Country;
  /** Current “Ordering near …” city — used when finding order options. */
  cityOrPostcode?: string;
  onCountryUpdated: (country: Country) => void;
  tone?: "light" | "dark";
};

/** Order-mode admin tools: find delivery / takeaway options. */
export function AdminOrderMenu({
  country,
  cityOrPostcode,
  onCountryUpdated,
  tone = "light",
}: AdminOrderMenuProps) {
  const t = useT();
  const menuId = useId();
  const { open, setOpen, rootRef, triggerRef, panelRef, position } = usePortalMenu({
    estimatedHeight: 120,
  });
  const [discoverOpen, setDiscoverOpen] = useState(false);

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
              onClick={() => {
                setOpen(false);
                setDiscoverOpen(true);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
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
        {t("admin.order.menu")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menu}

      {discoverOpen ? (
        <AdminDiscoverModal
          kind="orderOptions"
          country={country}
          open
          defaultCity={cityOrPostcode}
          onClose={() => setDiscoverOpen(false)}
          onCountryUpdated={onCountryUpdated}
        />
      ) : null}
    </div>
  );
}
