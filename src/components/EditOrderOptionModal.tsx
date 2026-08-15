import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import type { Country, OrderOption } from "@/types/content";
import { patchOrderOptionFields } from "@/admin/countryTools";
import { countryCatalog } from "@/content/countries/catalog";
import {
  orderOptionCuisineCodes,
  orderOptionPlatformLinks,
} from "@/restaurants/orderOptionLinks";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

export type EditOrderOptionAppliedResult = {
  country: Country;
  option: OrderOption;
};

type EditOrderOptionModalProps = {
  open: boolean;
  country: Country;
  option: OrderOption;
  onClose: () => void;
  onApplied: (result: EditOrderOptionAppliedResult) => void;
};

type CatalogEntry = (typeof countryCatalog)[number];

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function entryLabel(entry: CatalogEntry) {
  return `${entry.flag} ${entry.name}`;
}

function normalizeOptionalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    void new URL(withProtocol);
    return withProtocol;
  } catch {
    throw new Error("invalid-url");
  }
}

export function EditOrderOptionModal({
  open,
  country,
  option,
  onClose,
  onApplied,
}: EditOrderOptionModalProps) {
  const t = useT();
  const titleId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [thuisbezorgdUrl, setThuisbezorgdUrl] = useState("");
  const [ubereatsUrl, setUbereatsUrl] = useState("");
  const [cuisineCodes, setCuisineCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    for (const entry of countryCatalog) map.set(entry.code, entry);
    return map;
  }, []);

  const sortedCountries = useMemo(
    () =>
      [...countryCatalog].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [],
  );

  const selectedEntries = useMemo(
    () =>
      cuisineCodes
        .map((code) => byCode.get(code))
        .filter((entry): entry is CatalogEntry => Boolean(entry)),
    [byCode, cuisineCodes],
  );

  const suggestions = useMemo(() => {
    const selected = new Set(cuisineCodes);
    const available = sortedCountries.filter((entry) => !selected.has(entry.code));
    const needle = query.trim().toLowerCase();
    if (!needle) return available.slice(0, 12);
    return available
      .filter(
        (entry) =>
          entry.name.toLowerCase().includes(needle) ||
          entry.code.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [cuisineCodes, query, sortedCountries]);

  function updateMenuPosition() {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const gap = 6;
    const preferredMax = 240;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const placeBelow = spaceBelow >= 140 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      120,
      Math.min(preferredMax, placeBelow ? spaceBelow : spaceAbove),
    );
    const top = placeBelow
      ? rect.bottom + gap
      : Math.max(8, rect.top - gap - maxHeight);
    setMenuPosition({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;
    const links = orderOptionPlatformLinks(option);
    setName(option.name);
    setNotes(option.notes ?? "");
    setThuisbezorgdUrl(links.thuisbezorgd ?? "");
    setUbereatsUrl(links.ubereats ?? "");
    setCuisineCodes(orderOptionCuisineCodes(option, country.code));
    setQuery("");
    setSuggestOpen(false);
    setMenuPosition(null);
    setActiveIndex(0);
    setBusy(false);
    setError(null);
  }, [open, option, country.code]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !busy && !suggestOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose, suggestOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, cuisineCodes]);

  useLayoutEffect(() => {
    if (!suggestOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [suggestOpen, suggestions.length, selectedEntries.length, query]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (fieldRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setSuggestOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [suggestOpen]);

  if (!open) return null;

  function addCuisine(code: string) {
    const normalized = code.toLowerCase();
    setCuisineCodes((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized],
    );
    setQuery("");
    setSuggestOpen(true);
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function removeCuisine(code: string) {
    setCuisineCodes((prev) => prev.filter((item) => item !== code));
  }

  function onSuggestKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !query && cuisineCodes.length > 0) {
      event.preventDefault();
      removeCuisine(cuisineCodes[cuisineCodes.length - 1]!);
      return;
    }
    if (
      !suggestOpen &&
      (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")
    ) {
      if (event.key === "Enter" && !query.trim()) return;
      event.preventDefault();
      setSuggestOpen(true);
      return;
    }
    if (!suggestOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        suggestions.length === 0 ? 0 : (index + 1) % suggestions.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        suggestions.length === 0
          ? 0
          : (index - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const entry = suggestions[activeIndex];
      if (entry) addCuisine(entry.code);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestOpen(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error(t("admin.orderOption.edit.error.name"));
      }
      if (cuisineCodes.length < 1) {
        throw new Error(t("admin.orderOption.edit.error.countries"));
      }
      let nextTb: string | null;
      let nextUe: string | null;
      try {
        nextTb = normalizeOptionalUrl(thuisbezorgdUrl);
        nextUe = normalizeOptionalUrl(ubereatsUrl);
      } catch {
        throw new Error(t("admin.orderOption.edit.error.url"));
      }
      if (!nextTb && !nextUe) {
        throw new Error(t("admin.orderOption.edit.error.links"));
      }

      const result = await patchOrderOptionFields(country.code, option.id, {
        name: trimmedName,
        notes: notes.trim() || null,
        thuisbezorgdUrl: nextTb,
        ubereatsUrl: nextUe,
        cuisineCodes,
      });
      if (!result.country) {
        throw new Error(t("admin.orderOption.edit.error.save"));
      }
      onApplied({ country: result.country, option: result.option });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("admin.orderOption.edit.error.save"),
      );
    } finally {
      setBusy(false);
    }
  }

  const activeOptionId =
    suggestOpen && suggestions[activeIndex]
      ? `${listboxId}-option-${suggestions[activeIndex]!.code}`
      : undefined;

  const listbox =
    suggestOpen && menuPosition
      ? createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={t("admin.orderOption.edit.countries")}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            className={`fixed ${zClass.modalSelect} overflow-auto rounded-2xl border border-ink/10 bg-cream py-1 shadow-xl`}
          >
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-ink-soft">
                {t("admin.orderOption.edit.countries.empty")}
              </li>
            ) : (
              suggestions.map((entry, index) => {
                const isActive = index === activeIndex;
                return (
                  <li
                    key={entry.code}
                    id={`${listboxId}-option-${entry.code}`}
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    className={`cursor-pointer px-4 py-2.5 text-sm text-ink ${
                      isActive ? "bg-stamp/15" : "hover:bg-parchment"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      addCuisine(entry.code);
                    }}
                  >
                    {entryLabel(entry)}
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

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
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-[1.75rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("admin.orderOption.edit.eyebrow")}
            </p>
            <h2
              id={titleId}
              className="font-display text-3xl leading-tight text-burgundy"
            >
              {t("admin.orderOption.edit.title", { name: option.name })}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("admin.orderOption.edit.subtitle")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink disabled:opacity-60"
            aria-label={t("admin.orderOption.edit.close")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("admin.orderOption.edit.name")}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("admin.orderOption.edit.notes")}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder={t("admin.orderOption.edit.notes.placeholder")}
                className="mt-1 w-full resize-y rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("admin.orderOption.edit.thuisbezorgd")}
              </span>
              <input
                type="text"
                inputMode="url"
                value={thuisbezorgdUrl}
                onChange={(event) => setThuisbezorgdUrl(event.target.value)}
                placeholder="https://www.thuisbezorgd.nl/menu/…"
                className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("admin.orderOption.edit.ubereats")}
              </span>
              <input
                type="text"
                inputMode="url"
                value={ubereatsUrl}
                onChange={(event) => setUbereatsUrl(event.target.value)}
                placeholder="https://www.ubereats.com/nl/store/…"
                className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
              />
              <span className="mt-1 block text-xs text-ink-soft">
                {t("admin.orderOption.edit.links.hint")}
              </span>
            </label>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-soft">
                  {t("admin.orderOption.edit.countries")}
                </span>
                {cuisineCodes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCuisineCodes([]);
                      inputRef.current?.focus();
                    }}
                    className="text-xs font-semibold text-ink-soft hover:text-tomato"
                  >
                    {t("admin.orderOption.edit.countries.clear")}
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {t("admin.orderOption.edit.countries.hint")}
              </p>
              <div
                ref={fieldRef}
                className="mt-2 rounded-2xl border-2 border-ink/15 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-tomato/30"
                onMouseDown={() => inputRef.current?.focus()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEntries.map((entry) => (
                    <span
                      key={entry.code}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-parchment py-1 pl-2.5 pr-1 text-sm text-ink"
                    >
                      <span aria-hidden="true">{entry.flag}</span>
                      <span className="truncate">{entry.name}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeCuisine(entry.code);
                        }}
                        className="rounded-full p-1 text-ink-soft hover:bg-cream hover:text-ink"
                        aria-label={t("admin.orderOption.edit.countries.remove", {
                          name: entry.name,
                        })}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    placeholder={
                      cuisineCodes.length === 0
                        ? t("admin.orderOption.edit.countries.add")
                        : t("admin.orderOption.edit.countries.addAnother")
                    }
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSuggestOpen(true);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    onKeyDown={onSuggestKeyDown}
                    className="min-w-[8rem] flex-1 border-0 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-ink-soft/70"
                  />
                </div>
              </div>
              {listbox}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-tomato">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 px-5 py-4 sm:px-6">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-parchment hover:text-ink disabled:opacity-60"
            >
              {t("admin.orderOption.edit.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-cream hover:bg-burgundy/90 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  {t("admin.orderOption.edit.saving")}
                </>
              ) : (
                t("admin.orderOption.edit.save")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
