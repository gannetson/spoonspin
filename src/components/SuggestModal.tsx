import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import type { Country, Drink, Recipe, SpecialtyShop } from "@/types/content";
import {
  confirmSuggestion,
  fetchSuggestionStatus,
  previewSuggestion,
  type DrinkDraft,
  type RestaurantDraft,
  type ShopDraft,
  type SuggestionKind,
} from "@/suggestions/client";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

type SuggestModalProps = {
  kind: SuggestionKind;
  country: Country;
  open: boolean;
  onClose: () => void;
  onAdded: (
    result:
      | { kind: "recipe"; recipe: Recipe }
      | { kind: "restaurant"; restaurant: { id: string; name: string } }
      | { kind: "drink"; drink: Drink }
      | { kind: "shop"; shop: SpecialtyShop },
  ) => void;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready-recipe";
      notes: string;
      recipe: Omit<Recipe, "id">;
    }
  | {
      status: "ready-restaurant";
      notes: string;
      restaurant: RestaurantDraft;
    }
  | {
      status: "ready-drink";
      notes: string;
      drink: DrinkDraft;
    }
  | {
      status: "ready-shop";
      notes: string;
      shop: ShopDraft;
    }
  | { status: "not-found"; notes: string }
  | { status: "error"; message: string };

const DIFFICULTY_KEYS: Record<Recipe["difficulty"], string> = {
  easy: "recipe.difficulty.easy",
  medium: "recipe.difficulty.medium",
  challenging: "recipe.difficulty.challenging",
};

const COURSE_KEYS: Record<Recipe["category"], string> = {
  starter: "cook.course.starter",
  main: "cook.course.main",
  side: "cook.course.side",
  dessert: "cook.course.dessert",
  snack: "cook.course.snack",
};

const TITLE_KEYS: Record<SuggestionKind, string> = {
  recipe: "suggest.title.recipe",
  restaurant: "suggest.title.restaurant",
  drink: "suggest.title.drink",
  shop: "suggest.title.shop",
};

const PLACEHOLDER_KEYS: Record<SuggestionKind, string> = {
  recipe: "suggest.placeholder.recipe",
  restaurant: "suggest.placeholder.restaurant",
  drink: "suggest.placeholder.drink",
  shop: "suggest.placeholder.shop",
};

const ADD_KEYS: Record<SuggestionKind, string> = {
  recipe: "suggest.addRecipe",
  restaurant: "suggest.addRestaurant",
  drink: "suggest.addDrink",
  shop: "suggest.addShop",
};

export function SuggestModal({
  kind,
  country,
  open,
  onClose,
  onAdded,
}: SuggestModalProps) {
  const t = useT();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [placesConfigured, setPlacesConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPreview({ status: "idle" });
    setSaving(false);
    setOpenaiConfigured(null);
    setPlacesConfigured(null);
    let cancelled = false;
    void fetchSuggestionStatus().then((status) => {
      if (!cancelled) {
        setOpenaiConfigured(status.openaiConfigured);
        setPlacesConfigured(status.placesConfigured);
      }
    });
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lookupReady =
    kind === "restaurant"
      ? placesConfigured === true
      : openaiConfigured === true;
  const lookupDisabled =
    preview.status === "loading" || saving || !lookupReady;

  async function runPreview() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPreview({
        status: "error",
        message: t("suggest.error.queryTooShort"),
      });
      return;
    }
    if (kind === "restaurant" && placesConfigured === false) {
      setPreview({
        status: "error",
        message: t("suggest.placesMissing.error"),
      });
      return;
    }
    if (kind !== "restaurant" && openaiConfigured === false) {
      setPreview({
        status: "error",
        message: t("suggest.openaiMissing.error"),
      });
      return;
    }
    setPreview({ status: "loading" });
    try {
      const result = await previewSuggestion({
        kind,
        countryCode: country.code,
        countryName: country.name,
        query: trimmed,
      });
      if (!result.found) {
        setPreview({
          status: "not-found",
          notes: result.confirmationNotes || t("suggest.notFound.default"),
        });
        return;
      }
      if (kind === "recipe" && "recipe" in result && result.recipe) {
        setPreview({
          status: "ready-recipe",
          notes: result.confirmationNotes,
          recipe: result.recipe,
        });
        return;
      }
      if (
        kind === "restaurant" &&
        "restaurant" in result &&
        result.restaurant
      ) {
        setPreview({
          status: "ready-restaurant",
          notes: result.confirmationNotes,
          restaurant: result.restaurant,
        });
        return;
      }
      if (kind === "drink" && "drink" in result && result.drink) {
        setPreview({
          status: "ready-drink",
          notes: result.confirmationNotes,
          drink: result.drink,
        });
        return;
      }
      if (kind === "shop" && "shop" in result && result.shop) {
        setPreview({
          status: "ready-shop",
          notes: result.confirmationNotes,
          shop: result.shop,
        });
        return;
      }
      setPreview({
        status: "not-found",
        notes: result.confirmationNotes || t("suggest.notFound.default"),
      });
    } catch (error) {
      setPreview({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : t("suggest.error.lookupFailed"),
      });
    }
  }

  async function runConfirm() {
    const trimmed = query.trim();
    setSaving(true);
    try {
      if (preview.status === "ready-recipe") {
        const submission = await confirmSuggestion({
          kind: "recipe",
          countryCode: country.code,
          countryName: country.name,
          query: trimmed,
          confirmationNotes: preview.notes,
          recipe: preview.recipe,
        });
        if (submission.kind === "recipe") {
          onAdded({ kind: "recipe", recipe: submission.recipe });
        }
        onClose();
        return;
      }
      if (preview.status === "ready-restaurant") {
        const submission = await confirmSuggestion({
          kind: "restaurant",
          countryCode: country.code,
          countryName: country.name,
          query: trimmed,
          confirmationNotes: preview.notes,
          restaurant: preview.restaurant,
        });
        if (submission.kind === "restaurant") {
          const id =
            submission.restaurantRowId?.trim() ||
            `user:${preview.restaurant.name}`;
          onAdded({
            kind: "restaurant",
            restaurant: {
              id,
              name: submission.restaurant.name || preview.restaurant.name,
            },
          });
        }
        onClose();
        return;
      }
      if (preview.status === "ready-drink") {
        const submission = await confirmSuggestion({
          kind: "drink",
          countryCode: country.code,
          countryName: country.name,
          query: trimmed,
          confirmationNotes: preview.notes,
          drink: preview.drink,
        });
        if (submission.kind === "drink") {
          onAdded({ kind: "drink", drink: submission.drink });
        }
        onClose();
        return;
      }
      if (preview.status === "ready-shop") {
        const submission = await confirmSuggestion({
          kind: "shop",
          countryCode: country.code,
          countryName: country.name,
          query: trimmed,
          confirmationNotes: preview.notes,
          shop: preview.shop,
        });
        if (submission.kind === "shop") {
          onAdded({ kind: "shop", shop: submission.shop });
        }
        onClose();
      }
    } catch (error) {
      setPreview({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : t("suggest.error.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-4 sm:items-center`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-cream p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-3xl text-burgundy">
              {t(TITLE_KEYS[kind])}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t(
                kind === "restaurant"
                  ? "suggest.subtitle.restaurant"
                  : "suggest.subtitle",
                {
                  flag: country.flag,
                  name: country.name,
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink"
            aria-label={t("suggest.closeAria")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="suggest-query" className="mt-5 block text-sm font-semibold text-ink">
          {t("suggest.queryLabel")}
        </label>
        <textarea
          ref={inputRef}
          id="suggest-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          placeholder={t(PLACEHOLDER_KEYS[kind])}
          className="mt-2 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
        />

        {kind === "restaurant" && placesConfigured === false ? (
          <p
            role="status"
            className="mt-3 rounded-2xl border border-tomato/30 bg-white px-4 py-3 text-sm text-tomato"
          >
            {t("suggest.placesMissing.banner")}
          </p>
        ) : null}
        {kind !== "restaurant" && openaiConfigured === false ? (
          <p
            role="status"
            className="mt-3 rounded-2xl border border-tomato/30 bg-white px-4 py-3 text-sm text-tomato"
          >
            {t("suggest.openaiMissing.banner")}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={lookupDisabled}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {preview.status === "loading" ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {preview.status === "loading"
              ? t("suggest.lookingUp")
              : t("suggest.lookupConfirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-ink/15 px-5 text-sm font-semibold text-ink"
          >
            {t("suggest.cancel")}
          </button>
        </div>

        {preview.status === "error" ? (
          <p role="alert" className="mt-4 rounded-2xl border border-tomato/30 bg-white px-4 py-3 text-sm text-tomato">
            {preview.message}
          </p>
        ) : null}

        {preview.status === "not-found" ? (
          <p role="status" className="mt-4 rounded-2xl border border-dashed border-stamp/40 bg-white/60 px-4 py-3 text-sm text-ink-soft">
            {preview.notes}
          </p>
        ) : null}

        {preview.status === "ready-recipe" ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-parchment p-4">
            <p className="text-sm text-ink-soft">{preview.notes}</p>
            <p className="font-display text-2xl text-burgundy">{preview.recipe.name}</p>
            <p className="text-sm text-ink-soft">{preview.recipe.description}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-stamp">
              {t("suggest.preview.meta", {
                category: t(COURSE_KEYS[preview.recipe.category]),
                minutes:
                  preview.recipe.prepMinutes + preview.recipe.cookMinutes,
                difficulty: t(DIFFICULTY_KEYS[preview.recipe.difficulty]),
              })}
            </p>
            <ConfirmButton
              saving={saving}
              label={t(ADD_KEYS.recipe)}
              onClick={() => void runConfirm()}
            />
          </div>
        ) : null}

        {preview.status === "ready-restaurant" ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-parchment p-4">
            <p className="text-sm text-ink-soft">{preview.notes}</p>
            <p className="font-display text-2xl text-burgundy">
              {preview.restaurant.name}
            </p>
            <p className="text-sm text-ink-soft">
              {preview.restaurant.address}
              {preview.restaurant.city ? ` · ${preview.restaurant.city}` : ""}
            </p>
            {preview.restaurant.authenticityNotes ? (
              <p className="text-sm text-ink-soft">
                {preview.restaurant.authenticityNotes}
              </p>
            ) : null}
            <ConfirmButton
              saving={saving}
              label={t(ADD_KEYS.restaurant)}
              onClick={() => void runConfirm()}
            />
          </div>
        ) : null}

        {preview.status === "ready-drink" ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-parchment p-4">
            <p className="text-sm text-ink-soft">{preview.notes}</p>
            <p className="font-display text-2xl text-burgundy">{preview.drink.name}</p>
            <p className="text-sm text-ink-soft">{preview.drink.description}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-stamp">
              {preview.drink.type}
              {preview.drink.alcoholic ? " · alcoholic" : " · non-alcoholic"}
            </p>
            <ConfirmButton
              saving={saving}
              label={t(ADD_KEYS.drink)}
              onClick={() => void runConfirm()}
            />
          </div>
        ) : null}

        {preview.status === "ready-shop" ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-parchment p-4">
            <p className="text-sm text-ink-soft">{preview.notes}</p>
            <p className="font-display text-2xl text-burgundy">{preview.shop.name}</p>
            <p className="text-sm text-ink-soft">
              {preview.shop.address}
              {preview.shop.city ? ` · ${preview.shop.city}` : ""}
            </p>
            <p className="text-sm font-semibold text-ink">
              {preview.shop.specialty}
            </p>
            <ConfirmButton
              saving={saving}
              label={t(ADD_KEYS.shop)}
              onClick={() => void runConfirm()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmButton({
  saving,
  label,
  onClick,
}: {
  saving: boolean;
  label: string;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-5 text-sm font-semibold text-cream hover:bg-tomato-deep disabled:opacity-60"
    >
      {saving ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Plus className="size-4" aria-hidden="true" />
      )}
      {saving ? t("suggest.adding") : label}
    </button>
  );
}
