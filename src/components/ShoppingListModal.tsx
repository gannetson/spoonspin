import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Plus, Share2, Trash2, X } from "lucide-react";
import type { Ingredient } from "@/types/content";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import {
  copyText,
  formatGroceryShoppingLine,
  formatShoppingListShareText,
  groceryItemsForShoppingList,
  shoppingListItemKey,
} from "@/lib/shoppingList";
import { shareText, whatsappShareHref } from "@/lib/share";

type ShoppingLine = {
  id: string;
  ingredient: Ingredient;
};

type ShoppingListModalProps = {
  open: boolean;
  recipeTitle: string;
  servings: number;
  ingredients: Ingredient[];
  onClose: () => void;
};

function linesFromIngredients(ingredients: Ingredient[]): ShoppingLine[] {
  return groceryItemsForShoppingList(ingredients).map((ingredient, index) => ({
    id: shoppingListItemKey(ingredient, index),
    ingredient,
  }));
}

export function ShoppingListModal({
  open,
  recipeTitle,
  servings,
  ingredients,
  onClose,
}: ShoppingListModalProps) {
  const t = useT();
  const titleId = useId();
  const addId = useId();
  const addRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState(() => linesFromIngredients(ingredients));
  const [draft, setDraft] = useState("");
  const [statusKey, setStatusKey] = useState<
    | "recipe.shoppingList.copied"
    | "recipe.shoppingList.shared"
    | "recipe.shoppingList.whatsappOpened"
    | null
  >(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedIngredients = lines.map((line) => line.ingredient);
  const shareTextValue = formatShoppingListShareText({
    title: recipeTitle,
    ingredients: selectedIngredients,
  });

  if (!open || typeof document === "undefined") return null;

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function addLine(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    const id = `custom:${Date.now()}:${name.toLowerCase()}`;
    setLines((current) => [
      ...current,
      { id, ingredient: { name, quantity: 0, unit: "" } },
    ]);
    setDraft("");
    addRef.current?.focus();
  }

  function flash(
    key:
      | "recipe.shoppingList.copied"
      | "recipe.shoppingList.shared"
      | "recipe.shoppingList.whatsappOpened",
  ) {
    setStatusKey(key);
    window.setTimeout(() => setStatusKey(null), 2000);
  }

  async function handleCopy() {
    const ok = await copyText(shareTextValue);
    if (ok) flash("recipe.shoppingList.copied");
  }

  async function handleShare() {
    try {
      const result = await shareText({ title: recipeTitle, text: shareTextValue });
      flash(
        result === "shared"
          ? "recipe.shoppingList.shared"
          : "recipe.shoppingList.whatsappOpened",
      );
    } catch {
      setStatusKey(null);
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-0 print:hidden sm:items-center sm:p-4`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("recipe.shoppingList.kicker")}
            </p>
            <h2
              id={titleId}
              className="font-display text-2xl leading-tight text-burgundy"
            >
              {t("recipe.shoppingList.title")}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("recipe.shoppingList.subtitle", {
                name: recipeTitle,
                count: servings,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-ink/5"
            aria-label={t("recipe.shoppingList.closeAria")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("recipe.shoppingList.empty")}</p>
          ) : (
            <ul className="space-y-1" aria-label={t("recipe.shoppingList.itemsAria")}>
              {lines.map((line) => {
                const label = formatGroceryShoppingLine(line.ingredient);
                return (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-2 rounded-2xl px-2 py-2 hover:bg-parchment"
                  >
                    <span className="min-w-0 flex-1 pt-1 text-ink">{label}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-tomato"
                      aria-label={t("recipe.shoppingList.remove", {
                        name: line.ingredient.name,
                      })}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form className="mt-4 flex flex-wrap gap-2" onSubmit={addLine}>
            <label htmlFor={addId} className="sr-only">
              {t("recipe.shoppingList.addLabel")}
            </label>
            <input
              id={addId}
              ref={addRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("recipe.shoppingList.addPlaceholder")}
              className="min-h-11 min-w-0 flex-1 rounded-full border border-ink/20 bg-white px-4 text-sm text-ink outline-none ring-tomato/40 focus:ring-2"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato disabled:opacity-60"
            >
              <Plus aria-hidden="true" className="size-4" />
              {t("recipe.shoppingList.add")}
            </button>
          </form>
        </div>

        <div className="space-y-3 border-t border-ink/10 px-5 py-4">
          {statusKey ? (
            <p role="status" className="text-sm font-semibold text-ink">
              {t(statusKey)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={lines.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato disabled:opacity-60"
            >
              {statusKey === "recipe.shoppingList.copied" ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {t("recipe.shoppingList.copy")}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={lines.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato disabled:opacity-60"
            >
              <Share2 aria-hidden="true" className="size-4" />
              {t("recipe.shoppingList.share")}
            </button>
            <a
              href={whatsappShareHref(shareTextValue)}
              target="_blank"
              rel="noreferrer"
              aria-disabled={lines.length === 0}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato ${
                lines.length === 0 ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {t("recipe.shoppingList.whatsapp")}
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
