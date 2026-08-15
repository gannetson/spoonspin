import { useEffect, useId, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Country, Drink, OrderOption, SpecialtyShop } from "@/types/content";
import {
  addDrinks,
  addOrderOptions,
  addRecipes,
  addRestaurants,
  addShops,
  discoverDrinks,
  discoverOrderOptions,
  discoverRecipes,
  discoverRestaurants,
  discoverShops,
  type DishCandidate,
  type DiscoveredRestaurant,
} from "@/admin/countryTools";
import { fetchCountry } from "@/content/client";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { getPreferredDineCity } from "@/restaurants/locationPreference";

export type AdminDiscoverKind =
  "recipes" | "restaurants" | "shops" | "drinks" | "orderOptions";

type AdminDiscoverModalProps = {
  kind: AdminDiscoverKind;
  country: Country;
  open: boolean;
  onClose: () => void;
  onCountryUpdated: (country: Country) => void;
  /** Fired after restaurants are saved so Dine can re-search. */
  onRestaurantsAdded?: () => void;
  /** Prefill for order-option city (Dine “Search near …”). */
  defaultCity?: string;
};

type Item =
  | { kind: "recipes"; item: DishCandidate; key: string }
  | { kind: "restaurants"; item: DiscoveredRestaurant; key: string }
  | { kind: "shops"; item: SpecialtyShop; key: string }
  | { kind: "drinks"; item: Drink; key: string }
  | { kind: "orderOptions"; item: OrderOption; key: string };

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; notes: string; items: Item[] }
  | { status: "error"; message: string }
  | { status: "saved"; message: string };

function itemKey(kind: AdminDiscoverKind, index: number, name: string): string {
  return `${kind}:${index}:${name}`;
}

function addedMessageKey(kind: AdminDiscoverKind, count: number): string {
  if (kind === "recipes") {
    return count === 1 ? "admin.discover.added.recipe" : "admin.discover.added.recipes";
  }
  if (kind === "restaurants") {
    return count === 1
      ? "admin.discover.added.restaurant"
      : "admin.discover.added.restaurants";
  }
  if (kind === "drinks") {
    return count === 1 ? "admin.discover.added.drink" : "admin.discover.added.drinks";
  }
  if (kind === "orderOptions") {
    return count === 1
      ? "admin.discover.added.orderOption"
      : "admin.discover.added.orderOptions";
  }
  return count === 1 ? "admin.discover.added.shop" : "admin.discover.added.shops";
}

export function AdminDiscoverModal({
  kind,
  country,
  open,
  onClose,
  onCountryUpdated,
  onRestaurantsAdded,
  defaultCity,
}: AdminDiscoverModalProps) {
  const t = useT();
  const titleId = useId();
  const cityFieldId = useId();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(() => defaultCity?.trim() || getPreferredDineCity());
  const [state, setState] = useState<State>({ status: "idle" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const copy = {
    title: t(`admin.discover.${kind}.title`),
    hint: t(`admin.discover.${kind}.hint`),
    placeholder: t(`admin.discover.${kind}.placeholder`),
    empty: t(`admin.discover.${kind}.empty`),
  };

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCity(defaultCity?.trim() || getPreferredDineCity());
    setState({ status: "idle" });
    setSelected(new Set());
    setSaving(false);
  }, [open, kind, country.code, defaultCity]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function runDiscover() {
    setState({ status: "loading" });
    setSelected(new Set());
    try {
      if (kind === "recipes") {
        const result = await discoverRecipes(country.code, query);
        const items: Item[] = result.recipes.map((item, index) => ({
          kind: "recipes",
          item,
          key: itemKey("recipes", index, item.name),
        }));
        setState({ status: "ready", notes: result.notes, items });
        setSelected(new Set(items.map((item) => item.key)));
      } else if (kind === "restaurants") {
        const result = await discoverRestaurants(country.code, query);
        const items: Item[] = result.restaurants.map((item, index) => ({
          kind: "restaurants",
          item,
          key: itemKey("restaurants", index, item.name),
        }));
        setState({ status: "ready", notes: result.notes, items });
        setSelected(new Set(items.map((item) => item.key)));
      } else if (kind === "drinks") {
        const result = await discoverDrinks(country.code, query);
        const items: Item[] = result.drinks.map((item, index) => ({
          kind: "drinks",
          item,
          key: itemKey("drinks", index, item.name),
        }));
        setState({ status: "ready", notes: result.notes, items });
        setSelected(new Set(items.map((item) => item.key)));
      } else if (kind === "orderOptions") {
        const result = await discoverOrderOptions(country.code, {
          query,
          city: city.trim() || getPreferredDineCity(),
        });
        const items: Item[] = result.options.map((item, index) => ({
          kind: "orderOptions",
          item,
          key: itemKey("orderOptions", index, item.name),
        }));
        setState({ status: "ready", notes: result.notes, items });
        setSelected(new Set(items.map((item) => item.key)));
      } else {
        const result = await discoverShops(country.code, query);
        const items: Item[] = result.shops.map((item, index) => ({
          kind: "shops",
          item,
          key: itemKey("shops", index, item.name),
        }));
        setState({ status: "ready", notes: result.notes, items });
        setSelected(new Set(items.map((item) => item.key)));
      }
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : t("admin.discover.error.generic"),
      });
    }
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveSelected(options?: { review?: boolean }) {
    if (state.status !== "ready") return;
    const picked = state.items.filter((item) => selected.has(item.key));
    if (picked.length === 0) {
      setState({
        status: "error",
        message: t("admin.discover.error.selectOne"),
      });
      return;
    }
    setSaving(true);
    try {
      if (kind === "recipes") {
        const recipes = picked.map(
          (entry) => (entry as Extract<Item, { kind: "recipes" }>).item,
        );
        const result = await addRecipes(country.code, recipes);
        if (result.country) onCountryUpdated(result.country);
        setState({
          status: "saved",
          message: t(addedMessageKey("recipes", result.added), {
            count: result.added,
          }),
        });
        // Soft-refresh while expand + images finish in the background.
        if ((result.enrichmentQueued ?? 0) > 0) {
          const code = country.code;
          void (async () => {
            for (const delayMs of [4_000, 10_000, 20_000]) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              try {
                const refreshed = await fetchCountry(code);
                if (refreshed) onCountryUpdated(refreshed);
              } catch {
                /* ignore transient refresh errors */
              }
            }
          })();
        }
      } else if (kind === "restaurants") {
        const restaurants = picked.map(
          (entry) => (entry as Extract<Item, { kind: "restaurants" }>).item,
        );
        const withReview = options?.review === true;
        const result = await addRestaurants(country.code, restaurants, {
          review: withReview,
        });
        onRestaurantsAdded?.();
        setState({
          status: "saved",
          message: t(
            withReview
              ? result.added === 1
                ? "admin.discover.added.restaurant.reviewed"
                : "admin.discover.added.restaurants.reviewed"
              : addedMessageKey("restaurants", result.added),
            { count: result.added },
          ),
        });
        if ((result.enrichmentQueued ?? 0) > 0) {
          void (async () => {
            for (const delayMs of [4_000, 10_000, 20_000]) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              onRestaurantsAdded?.();
            }
          })();
        }
      } else if (kind === "drinks") {
        const drinks = picked.map(
          (entry) => (entry as Extract<Item, { kind: "drinks" }>).item,
        );
        const result = await addDrinks(country.code, drinks);
        if (result.country) onCountryUpdated(result.country);
        setState({
          status: "saved",
          message: t(addedMessageKey("drinks", result.added), {
            count: result.added,
          }),
        });
      } else if (kind === "orderOptions") {
        const optionsList = picked.map(
          (entry) => (entry as Extract<Item, { kind: "orderOptions" }>).item,
        );
        const result = await addOrderOptions(country.code, optionsList);
        if (result.country) onCountryUpdated(result.country);
        const enriched = (result.enrichmentQueued ?? 0) > 0;
        setState({
          status: "saved",
          message: t(
            enriched
              ? result.added === 1
                ? "admin.discover.added.orderOption.enriched"
                : "admin.discover.added.orderOptions.enriched"
              : addedMessageKey("orderOptions", result.added),
            { count: result.added },
          ),
        });
        if (enriched) {
          const code = country.code;
          void (async () => {
            for (const delayMs of [4_000, 10_000, 20_000, 40_000]) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              try {
                const refreshed = await fetchCountry(code);
                if (refreshed) onCountryUpdated(refreshed);
              } catch {
                /* ignore transient refresh errors */
              }
            }
          })();
        }
      } else {
        const shops = picked.map(
          (entry) => (entry as Extract<Item, { kind: "shops" }>).item,
        );
        const result = await addShops(country.code, shops);
        if (result.country) onCountryUpdated(result.country);
        setState({
          status: "saved",
          message: t(addedMessageKey("shops", result.added), {
            count: result.added,
          }),
        });
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : t("admin.discover.error.save"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-4 sm:items-center`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-cream shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 p-5 pb-0 sm:p-7 sm:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-3xl text-burgundy">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{copy.hint}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-ink-soft hover:bg-ink/5"
              aria-label={t("admin.discover.closeAria")}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {kind === "orderOptions" ? (
              <div>
                <label htmlFor={cityFieldId} className="text-sm font-semibold text-ink">
                  {t("admin.discover.orderOptions.city")}
                </label>
                <input
                  id={cityFieldId}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={t("admin.discover.orderOptions.cityPlaceholder")}
                  className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-parchment px-4 text-ink"
                  autoComplete="address-level2"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                className="min-h-12 flex-1 rounded-full border-2 border-ink/15 bg-parchment px-4 text-ink"
              />
              <button
                type="button"
                onClick={() => void runDiscover()}
                disabled={state.status === "loading" || saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-tomato px-5 font-semibold text-cream disabled:opacity-60"
              >
                {state.status === "loading" ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {t("admin.discover.querying")}
                  </>
                ) : (
                  t("admin.discover.query")
                )}
              </button>
            </div>
          </div>

          {state.status === "error" ? (
            <p role="alert" className="mt-4 text-sm text-tomato">
              {state.message}
            </p>
          ) : null}

          {state.status === "saved" ? (
            <p role="status" className="mt-4 text-sm font-semibold text-ink">
              {state.message}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {state.status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                {state.notes}
                {state.items.length > 0
                  ? ` · ${
                      state.items.length === 1
                        ? t("admin.discover.resultsCount", {
                            count: state.items.length,
                          })
                        : t("admin.discover.resultsCountPlural", {
                            count: state.items.length,
                          })
                    }`
                  : ""}
              </p>
              {state.items.length === 0 ? (
                <p className="text-sm text-ink-soft">{copy.empty}</p>
              ) : (
                <ul className="max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto pr-1">
                  {state.items.map((entry) => (
                    <li key={entry.key}>
                      <label className="flex cursor-pointer gap-3 rounded-2xl border border-ink/10 bg-parchment/70 p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.key)}
                          onChange={() => toggle(entry.key)}
                          className="mt-1 size-4 accent-tomato"
                        />
                        <span className="min-w-0 flex-1">
                          {entry.kind === "recipes" ? (
                            <>
                              <span className="block font-semibold text-ink">
                                {entry.item.name}
                                {entry.item.localName ? (
                                  <span className="font-normal text-ink-soft">
                                    {" "}
                                    · {entry.item.localName}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-sm text-ink-soft">
                                {entry.item.category} · {entry.item.description}
                              </span>
                            </>
                          ) : null}
                          {entry.kind === "restaurants" ? (
                            <>
                              <span className="block font-semibold text-ink">
                                {entry.item.name}
                                {entry.item.verified ? (
                                  <span className="ml-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                                    {t("admin.discover.restaurants.verified")}
                                  </span>
                                ) : null}
                                {entry.item.confidence ? (
                                  <span className="ml-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                                    {t("admin.discover.restaurants.confidence", {
                                      level: entry.item.confidence,
                                    })}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-sm text-ink-soft">
                                {entry.item.address}, {entry.item.city}
                                {entry.item.cuisine ? ` · ${entry.item.cuisine}` : null}
                                {entry.item.authenticityRating != null
                                  ? ` · ${t("admin.discover.restaurants.authenticity", {
                                      rating: entry.item.authenticityRating,
                                    })}`
                                  : null}
                              </span>
                              {entry.item.cuisineEvidence ||
                              entry.item.authenticityNotes ? (
                                <span className="mt-1 block text-sm text-ink-soft">
                                  {entry.item.cuisineEvidence ||
                                    entry.item.authenticityNotes}
                                </span>
                              ) : null}
                              {entry.item.website || entry.item.evidenceSourceUrl ? (
                                <span className="mt-1 block text-sm text-ink-soft">
                                  {entry.item.website ? (
                                    <a
                                      href={entry.item.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-tomato underline-offset-2 hover:underline"
                                    >
                                      {t("admin.discover.restaurants.website")}
                                    </a>
                                  ) : null}
                                  {entry.item.website &&
                                  entry.item.evidenceSourceUrl &&
                                  entry.item.evidenceSourceUrl !== entry.item.website
                                    ? " · "
                                    : null}
                                  {entry.item.evidenceSourceUrl &&
                                  entry.item.evidenceSourceUrl !== entry.item.website ? (
                                    <a
                                      href={entry.item.evidenceSourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-tomato underline-offset-2 hover:underline"
                                    >
                                      {t("admin.discover.restaurants.evidence")}
                                    </a>
                                  ) : null}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                          {entry.kind === "shops" ? (
                            <>
                              <span className="block font-semibold text-ink">
                                {entry.item.name}
                              </span>
                              <span className="mt-1 block text-sm text-ink-soft">
                                {entry.item.address}, {entry.item.city}
                              </span>
                              <span className="mt-1 block text-sm text-ink-soft">
                                {entry.item.specialty}
                              </span>
                            </>
                          ) : null}
                          {entry.kind === "orderOptions" ? (
                            <>
                              <span className="block font-semibold text-ink">
                                {entry.item.name}
                                <span className="ml-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                                  {t(`dine.order.platform.${entry.item.platform}`)}
                                </span>
                              </span>
                              {entry.item.signatureDish ? (
                                <span className="mt-1 block text-sm font-medium text-tomato">
                                  {t("dine.order.signatureDish", {
                                    dish: entry.item.signatureDish,
                                  })}
                                </span>
                              ) : null}
                              <span className="mt-1 block text-sm text-ink-soft">
                                {entry.item.city ? `${entry.item.city} · ` : null}
                                {entry.item.notes ?? entry.item.url}
                              </span>
                            </>
                          ) : null}
                          {entry.kind === "drinks" ? (
                            <>
                              <span className="flex gap-3">
                                {entry.item.imageUrl ? (
                                  <img
                                    src={entry.item.imageUrl}
                                    alt=""
                                    className="h-14 w-10 shrink-0 rounded object-cover"
                                  />
                                ) : null}
                                <span className="min-w-0">
                                  <span className="block font-semibold text-ink">
                                    {entry.item.name}
                                    {entry.item.localName ? (
                                      <span className="font-normal text-ink-soft">
                                        {" "}
                                        · {entry.item.localName}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 block text-sm text-ink-soft">
                                    {entry.item.type}
                                    {entry.item.alcoholic
                                      ? ` · ${t("admin.discover.drinks.alcoholic")}`
                                      : ` · ${t("admin.discover.drinks.nonAlcoholic")}`}
                                    {entry.item.grape
                                      ? ` · ${t("admin.discover.drinks.grape")}: ${entry.item.grape}`
                                      : null}
                                    {" · "}
                                    {entry.item.description}
                                  </span>
                                  {entry.item.foodPairing ? (
                                    <span className="mt-1 block text-sm text-ink-soft">
                                      {t("admin.discover.drinks.foodPairing")}:{" "}
                                      {entry.item.foodPairing}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            </>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-ink/10 px-5 py-4 sm:px-7">
          {state.status === "ready" ? (
            <div className="flex flex-wrap gap-3">
              {kind === "restaurants" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void saveSelected({ review: false })}
                    disabled={saving || selected.size === 0}
                    className="inline-flex min-h-12 items-center rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-60"
                  >
                    {saving
                      ? t("admin.discover.adding")
                      : t("admin.discover.add", { count: selected.size })}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSelected({ review: true })}
                    disabled={saving || selected.size === 0}
                    className="inline-flex min-h-12 items-center rounded-full bg-tomato px-5 font-semibold text-cream disabled:opacity-60"
                  >
                    {saving
                      ? t("admin.discover.adding")
                      : t("admin.discover.addAndReview", {
                          count: selected.size,
                        })}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void saveSelected()}
                  disabled={saving || selected.size === 0}
                  className="inline-flex min-h-12 items-center rounded-full bg-ink px-5 font-semibold text-cream disabled:opacity-60"
                >
                  {saving
                    ? t("admin.discover.adding")
                    : t("admin.discover.addSelected", { count: selected.size })}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-full px-4 font-semibold text-ink-soft underline-offset-2 hover:underline"
              >
                {t("admin.discover.close")}
              </button>
            </div>
          ) : null}

          {state.status === "saved" ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-full bg-ink px-5 font-semibold text-cream"
            >
              {t("admin.discover.done")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
