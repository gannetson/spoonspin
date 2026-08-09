import { useState } from "react";
import { Store } from "lucide-react";
import type { Country } from "@/types/content";
import { AdminDiscoverModal } from "@/components/AdminDiscoverModal";
import { useT } from "@/i18n/LocaleContext";

type AdminDineMenuProps = {
  country: Country;
  onCountryUpdated: (country: Country) => void;
  onRestaurantsAdded: () => void;
  tone?: "light" | "dark";
};

/** Dine-mode admin action: find more restaurants. */
export function AdminDineMenu({
  country,
  onCountryUpdated,
  onRestaurantsAdded,
  tone = "light",
}: AdminDineMenuProps) {
  const t = useT();
  const [discoverOpen, setDiscoverOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDiscoverOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
          tone === "dark"
            ? "bg-cream/15 text-cream ring-1 ring-cream/30 hover:bg-cream/25"
            : "border border-ink/15 bg-ink px-4 text-cream hover:bg-ink/90"
        }`}
      >
        <Store aria-hidden="true" className="size-4" />
        {t("admin.dine.findRestaurants")}
      </button>

      {discoverOpen ? (
        <AdminDiscoverModal
          kind="restaurants"
          country={country}
          open
          onClose={() => setDiscoverOpen(false)}
          onCountryUpdated={onCountryUpdated}
          onRestaurantsAdded={onRestaurantsAdded}
        />
      ) : null}
    </>
  );
}
