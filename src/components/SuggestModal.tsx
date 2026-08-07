import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import type { Country, Recipe } from "@/types/content";
import {
  confirmSuggestion,
  fetchSuggestionStatus,
  previewSuggestion,
  type RestaurantDraft,
  type SuggestionKind,
} from "@/suggestions/client";

type SuggestModalProps = {
  kind: SuggestionKind;
  country: Country;
  open: boolean;
  onClose: () => void;
  onAdded: (result: { kind: "recipe"; recipe: Recipe } | { kind: "restaurant" }) => void;
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
  | { status: "not-found"; notes: string }
  | { status: "error"; message: string };

export function SuggestModal({
  kind,
  country,
  open,
  onClose,
  onAdded,
}: SuggestModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPreview({ status: "idle" });
    setSaving(false);
    setOpenaiConfigured(null);
    let cancelled = false;
    void fetchSuggestionStatus().then((status) => {
      if (!cancelled) setOpenaiConfigured(status.openaiConfigured);
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

  const noun = kind === "recipe" ? "recipe" : "restaurant";
  const placeholder =
    kind === "recipe"
      ? `e.g. Banitsa, or “cheese filo pastry breakfast”`
      : `e.g. Restaurant name in Leiden, or “cozy Bulgarian place near Den Haag”`;
  const lookupDisabled =
    preview.status === "loading" ||
    saving ||
    openaiConfigured === false;

  async function runPreview() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPreview({
        status: "error",
        message: "Type a name or short description first.",
      });
      return;
    }
    if (openaiConfigured === false) {
      setPreview({
        status: "error",
        message:
          "Add OPENAI_API_KEY to your .env (not ADMIN_TOKEN), then restart npm run dev.",
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
          notes: result.confirmationNotes || "Nothing clear enough to add.",
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
      setPreview({
        status: "not-found",
        notes: result.confirmationNotes || "Nothing clear enough to add.",
      });
    } catch (error) {
      setPreview({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not look this up right now.",
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
        await confirmSuggestion({
          kind: "restaurant",
          countryCode: country.code,
          countryName: country.name,
          query: trimmed,
          confirmationNotes: preview.notes,
          restaurant: preview.restaurant,
        });
        onAdded({ kind: "restaurant" });
        onClose();
      }
    } catch (error) {
      setPreview({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not save suggestion.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-4 sm:items-center"
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
            <h2 id={titleId} className="font-display text-3xl text-ink">
              Suggest a {noun}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              For {country.flag} {country.name}. We&apos;ll confirm with a quick
              search, then add it right away for review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="suggest-query" className="mt-5 block text-sm font-semibold text-ink">
          Name or short description
        </label>
        <textarea
          ref={inputRef}
          id="suggest-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          placeholder={placeholder}
          className="mt-2 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
        />

        {openaiConfigured === false ? (
          <p
            role="status"
            className="mt-3 rounded-2xl border border-tomato/30 bg-white px-4 py-3 text-sm text-tomato"
          >
            Suggestions need <code className="font-semibold">OPENAI_API_KEY</code> in{" "}
            <code className="font-semibold">.env</code>, then restart{" "}
            <code className="font-semibold">npm run dev</code>.{" "}
            <code className="font-semibold">ADMIN_TOKEN</code> is only for the{" "}
            <a href="/admin" className="underline">
              /admin
            </a>{" "}
            review page.
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
            Look up &amp; confirm
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-ink/15 px-5 text-sm font-semibold text-ink"
          >
            Cancel
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
            <p className="font-display text-2xl text-ink">{preview.recipe.name}</p>
            <p className="text-sm text-ink-soft">{preview.recipe.description}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-stamp">
              {preview.recipe.category} · {preview.recipe.prepMinutes + preview.recipe.cookMinutes}{" "}
              min · {preview.recipe.difficulty}
            </p>
            <button
              type="button"
              onClick={() => void runConfirm()}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-5 text-sm font-semibold text-cream hover:bg-tomato-deep disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Add recipe
            </button>
          </div>
        ) : null}

        {preview.status === "ready-restaurant" ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-parchment p-4">
            <p className="text-sm text-ink-soft">{preview.notes}</p>
            <p className="font-display text-2xl text-ink">
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
            <button
              type="button"
              onClick={() => void runConfirm()}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-5 text-sm font-semibold text-cream hover:bg-tomato-deep disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Add restaurant
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
