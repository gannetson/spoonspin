import { useEffect, useId, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import type { Country, Ingredient, Recipe } from "@/types/content";
import { patchRecipeFields } from "@/admin/countryTools";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

export type EditRecipeAppliedResult = {
  country?: Country;
  recipe: Recipe;
};

type SectionId = "description" | "ingredients" | "steps" | "extras";

type EditRecipeModalProps = {
  open: boolean;
  country: Country;
  recipe: Recipe;
  onClose: () => void;
  onApplied: (result: EditRecipeAppliedResult) => void;
};

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function EditRecipeModal({
  open,
  country,
  recipe,
  onClose,
  onApplied,
}: EditRecipeModalProps) {
  const t = useT();
  const titleId = useId();
  const [section, setSection] = useState<SectionId>("description");
  const [localName, setLocalName] = useState("");
  const [description, setDescription] = useState("");
  const [dietaryLabels, setDietaryLabels] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stepsText, setStepsText] = useState("");
  const [substitutions, setSubstitutions] = useState("");
  const [servingSuggestion, setServingSuggestion] = useState("");
  const [drinkPairing, setDrinkPairing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSection("description");
    setLocalName(recipe.localName ?? "");
    setDescription(recipe.description);
    setDietaryLabels((recipe.dietaryLabels ?? []).join(", "));
    setIngredients(
      recipe.ingredients.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note,
      })),
    );
    setStepsText(recipe.steps.join("\n"));
    setSubstitutions((recipe.substitutions ?? []).join("\n"));
    setServingSuggestion(recipe.servingSuggestion ?? "");
    setDrinkPairing(recipe.drinkPairing ?? "");
    setBusy(false);
    setError(null);
  }, [open, recipe]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const steps = linesToList(stepsText);
      if (description.trim().length < 20) {
        throw new Error(t("admin.recipe.edit.error.description"));
      }
      if (ingredients.length < 2) {
        throw new Error(t("admin.recipe.edit.error.ingredients"));
      }
      if (steps.length < 3) {
        throw new Error(t("admin.recipe.edit.error.steps"));
      }
      for (const item of ingredients) {
        if (!item.name.trim() || !item.unit.trim() || !(item.quantity > 0)) {
          throw new Error(t("admin.recipe.edit.error.ingredientRow"));
        }
      }

      const result = await patchRecipeFields(country.code, recipe.id, {
        localName: localName.trim() || null,
        description: description.trim(),
        dietaryLabels: dietaryLabels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        ingredients: ingredients.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
          note: item.note?.trim() || undefined,
        })),
        steps,
        substitutions: linesToList(substitutions),
        servingSuggestion: servingSuggestion.trim() || null,
        drinkPairing: drinkPairing.trim() || null,
      });
      if (!result.recipe) {
        throw new Error(t("admin.recipe.edit.error.save"));
      }
      onApplied({ country: result.country, recipe: result.recipe });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.recipe.edit.error.save"),
      );
    } finally {
      setBusy(false);
    }
  }

  const sections: Array<{ id: SectionId; label: string }> = [
    { id: "description", label: t("admin.recipe.edit.section.description") },
    { id: "ingredients", label: t("admin.recipe.edit.section.ingredients") },
    { id: "steps", label: t("admin.recipe.edit.section.steps") },
    { id: "extras", label: t("admin.recipe.edit.section.extras") },
  ];

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-[1.75rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("admin.recipe.edit.eyebrow")}
            </p>
            <h2
              id={titleId}
              className="font-display text-3xl leading-tight text-burgundy"
            >
              {t("admin.recipe.edit.title", { name: recipe.name })}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("admin.recipe.edit.subtitle")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink disabled:opacity-60"
            aria-label={t("admin.recipe.edit.close")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-ink/10 px-5 py-3 sm:px-6">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={section === item.id}
              onClick={() => setSection(item.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                section === item.id
                  ? "bg-burgundy text-cream"
                  : "bg-parchment text-burgundy hover:bg-burgundy/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {section === "description" ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.localName")}
                  </span>
                  <input
                    value={localName}
                    onChange={(event) => setLocalName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.description")}
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    minLength={20}
                    rows={6}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                </label>
              </>
            ) : null}

            {section === "ingredients" ? (
              <div className="space-y-3">
                {ingredients.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-2xl border border-ink/10 bg-white p-3 sm:grid-cols-[1fr_5rem_5rem_auto]"
                  >
                    <input
                      value={item.name}
                      onChange={(event) => {
                        const next = [...ingredients];
                        next[index] = { ...item, name: event.target.value };
                        setIngredients(next);
                      }}
                      placeholder={t("admin.recipe.edit.ingredient.name")}
                      className="rounded-xl border border-ink/15 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={item.quantity}
                      onChange={(event) => {
                        const next = [...ingredients];
                        next[index] = {
                          ...item,
                          quantity: Number(event.target.value),
                        };
                        setIngredients(next);
                      }}
                      placeholder={t("admin.recipe.edit.ingredient.qty")}
                      className="rounded-xl border border-ink/15 px-3 py-2 text-sm"
                    />
                    <input
                      value={item.unit}
                      onChange={(event) => {
                        const next = [...ingredients];
                        next[index] = { ...item, unit: event.target.value };
                        setIngredients(next);
                      }}
                      placeholder={t("admin.recipe.edit.ingredient.unit")}
                      className="rounded-xl border border-ink/15 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setIngredients(
                          ingredients.filter((_, i) => i !== index),
                        )
                      }
                      className="inline-flex items-center justify-center rounded-xl p-2 text-tomato hover:bg-tomato/10"
                      aria-label={t("admin.recipe.edit.ingredient.remove")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <input
                      value={item.note ?? ""}
                      onChange={(event) => {
                        const next = [...ingredients];
                        next[index] = {
                          ...item,
                          note: event.target.value || undefined,
                        };
                        setIngredients(next);
                      }}
                      placeholder={t("admin.recipe.edit.ingredient.note")}
                      className="rounded-xl border border-ink/15 px-3 py-2 text-sm sm:col-span-4"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setIngredients([
                      ...ingredients,
                      { name: "", quantity: 1, unit: "" },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold hover:border-tomato hover:text-tomato"
                >
                  <Plus className="size-4" />
                  {t("admin.recipe.edit.ingredient.add")}
                </button>
              </div>
            ) : null}

            {section === "steps" ? (
              <label className="block">
                <span className="text-sm font-medium text-ink-soft">
                  {t("admin.recipe.edit.steps")}
                </span>
                <textarea
                  value={stepsText}
                  onChange={(event) => setStepsText(event.target.value)}
                  rows={12}
                  className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 font-mono text-sm text-ink outline-none ring-tomato/30 focus:ring-2"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  {t("admin.recipe.edit.steps.hint")}
                </span>
              </label>
            ) : null}

            {section === "extras" ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.dietary")}
                  </span>
                  <input
                    value={dietaryLabels}
                    onChange={(event) => setDietaryLabels(event.target.value)}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                  <span className="mt-1 block text-xs text-ink-soft">
                    {t("admin.recipe.edit.dietary.hint")}
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.substitutions")}
                  </span>
                  <textarea
                    value={substitutions}
                    onChange={(event) => setSubstitutions(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                  <span className="mt-1 block text-xs text-ink-soft">
                    {t("admin.recipe.edit.listHint")}
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.serving")}
                  </span>
                  <textarea
                    value={servingSuggestion}
                    onChange={(event) =>
                      setServingSuggestion(event.target.value)
                    }
                    rows={3}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink-soft">
                    {t("admin.recipe.edit.pairing")}
                  </span>
                  <textarea
                    value={drinkPairing}
                    onChange={(event) => setDrinkPairing(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                  />
                </label>
              </>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm font-semibold text-tomato">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-ink/10 px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato/90 disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {busy
                ? t("admin.recipe.edit.saving")
                : t("admin.recipe.edit.save")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-12 rounded-full bg-ink/10 px-6 font-semibold text-ink disabled:opacity-60"
            >
              {t("admin.recipe.edit.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
