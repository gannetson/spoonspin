import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  GlassWater,
  ImagePlus,
  Images,
  LayoutGrid,
  LoaderCircle,
  Store,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import type { Country } from "@/types/content";
import {
  composeDinner,
  findDrinkImages,
  replaceCountryImage,
} from "@/admin/countryTools";
import {
  AdminDiscoverModal,
  type AdminDiscoverKind,
} from "@/components/AdminDiscoverModal";
import { useT } from "@/i18n/LocaleContext";

type AdminCountryMenuProps = {
  country?: Country | null;
  onCountryUpdated?: (country: Country) => void;
  onRestaurantsAdded?: () => void;
  tone?: "light" | "dark";
};

export function AdminCountryMenu({
  country,
  onCountryUpdated,
  onRestaurantsAdded,
  tone = "light",
}: AdminCountryMenuProps) {
  const t = useT();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [discoverKind, setDiscoverKind] = useState<AdminDiscoverKind | null>(
    null,
  );
  const [imageBusy, setImageBusy] = useState(false);
  const [drinkImagesBusy, setDrinkImagesBusy] = useState(false);
  const [dinnerBusy, setDinnerBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCountry = Boolean(country);
  const menuBusy = imageBusy || drinkImagesBusy || dinnerBusy;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onReplaceImage() {
    if (!country || !onCountryUpdated) return;
    setOpen(false);
    setImageBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await replaceCountryImage(country.code);
      onCountryUpdated(result.country);
      setStatus(
        t("admin.country.imageUpdated", { dishName: result.dishName }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.country.imageError"),
      );
    } finally {
      setImageBusy(false);
    }
  }

  async function onFindDrinkImages() {
    if (!country || !onCountryUpdated) return;
    setOpen(false);
    setDrinkImagesBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await findDrinkImages(country.code);
      onCountryUpdated(result.country);
      setStatus(
        t("admin.country.drinkImagesUpdated", {
          updated: result.updated,
          skipped: result.skipped,
          missing: result.missing,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("admin.country.drinkImagesError"),
      );
    } finally {
      setDrinkImagesBusy(false);
    }
  }

  async function onComposeDinner() {
    if (!country || !onCountryUpdated) return;
    setOpen(false);
    setDinnerBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await composeDinner(country.code);
      onCountryUpdated(result.country);
      setStatus(t("admin.country.dinnerComposed", { title: result.dinner.title }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.country.dinnerError"),
      );
    } finally {
      setDinnerBusy(false);
    }
  }

  function openDiscover(kind: AdminDiscoverKind) {
    if (!country) return;
    setOpen(false);
    setDiscoverKind(kind);
    setError(null);
    setStatus(null);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
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
        {t("admin.country.menu")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menuBusy || status || error ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-max max-w-[16rem] rounded-lg border border-ink/10 bg-cream px-3 py-2 text-sm text-ink shadow-md">
          {menuBusy ? (
            <span className="inline-flex items-center gap-2 text-ink-soft">
              <LoaderCircle className="size-4 animate-spin" />
              {drinkImagesBusy
                ? t("admin.country.findingDrinkImages")
                : dinnerBusy
                  ? t("admin.country.composingDinner")
                  : t("admin.country.findingImage")}
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
        </div>
      ) : null}

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-lg"
        >
          <Link
            to="/admin"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
          >
            <LayoutGrid className="mt-0.5 size-4 shrink-0 text-tomato" />
            <span>
              <span className="block font-semibold text-ink">
                {t("admin.country.overview")}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {t("admin.country.overview.hint")}
              </span>
            </span>
          </Link>
          <Link
            to="/admin/review"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
          >
            <ClipboardList className="mt-0.5 size-4 shrink-0 text-tomato" />
            <span>
              <span className="block font-semibold text-ink">
                {t("admin.country.review")}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {t("admin.country.review.hint")}
              </span>
            </span>
          </Link>

          {!hasCountry ? (
            <p className="border-t border-ink/10 px-4 py-3 text-xs text-ink-soft">
              {t("admin.country.needCountry")}
            </p>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                disabled={imageBusy}
                onClick={() => void onReplaceImage()}
                className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment disabled:opacity-60"
              >
                <ImagePlus className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t("admin.country.replaceImage")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t("admin.country.replaceImage.hint")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={drinkImagesBusy}
                onClick={() => void onFindDrinkImages()}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment disabled:opacity-60"
              >
                <Images className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t("admin.country.findDrinkImages")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t("admin.country.findDrinkImages.hint")}
                  </span>
                </span>
              </button>
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
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment disabled:opacity-60"
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
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
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
                onClick={() => openDiscover("restaurants")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
              >
                <Store className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t("admin.country.findRestaurants")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t("admin.country.findRestaurants.hint")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => openDiscover("shops")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
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
            </>
          )}
        </div>
      ) : null}

      {discoverKind && country && onCountryUpdated ? (
        <AdminDiscoverModal
          kind={discoverKind}
          country={country}
          open
          onClose={() => setDiscoverKind(null)}
          onCountryUpdated={onCountryUpdated}
          onRestaurantsAdded={onRestaurantsAdded}
        />
      ) : null}
    </div>
  );
}
