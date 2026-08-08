import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Country } from "@/types/content";
import { useT } from "@/i18n/LocaleContext";

type CountrySelectProps = {
  countries: Country[];
  value?: string;
  onSelect: (code: string) => void;
  id?: string;
  label?: string;
  /** Use on dark photo backgrounds (hero). */
  tone?: "light" | "dark";
};

function countryLabel(country: Country) {
  return `${country.flag} ${country.name}`;
}

export function CountrySelect({
  countries,
  value = "",
  onSelect,
  id = "country-select",
  label,
  tone = "light",
}: CountrySelectProps) {
  const t = useT();
  const resolvedLabel = label ?? t("country.select.label");
  const listboxId = useId();
  const sorted = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries],
  );
  const selected = sorted.find((country) => country.code === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(
      (country) =>
        country.name.toLowerCase().includes(needle) ||
        country.code.toLowerCase().includes(needle),
    );
  }, [query, sorted]);

  useEffect(() => {
    if (!open) {
      setQuery(selected ? countryLabel(selected) : "");
      setActiveIndex(0);
    }
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    option?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open, filtered]);

  const choose = (country: Country) => {
    onSelect(country.code);
    setQuery(countryLabel(country));
    setOpen(false);
    inputRef.current?.blur();
  };

  const openList = (resetQuery = false) => {
    if (resetQuery) setQuery("");
    setOpen(true);
    const options = resetQuery ? sorted : filtered;
    const index = selected
      ? options.findIndex((country) => country.code === selected.code)
      : 0;
    setActiveIndex(index >= 0 ? index : 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !open &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      event.preventDefault();
      openList(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        filtered.length === 0 ? 0 : (index + 1) % filtered.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        filtered.length === 0
          ? 0
          : (index - 1 + filtered.length) % filtered.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const country = filtered[activeIndex];
      if (country) choose(country);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const activeOptionId =
    open && filtered[activeIndex]
      ? `${listboxId}-option-${filtered[activeIndex].code}`
      : undefined;

  return (
    <div ref={rootRef} className="relative flex w-full max-w-sm flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-sm font-medium ${tone === "dark" ? "text-cream/85" : "text-ink-soft"}`}
      >
        {resolvedLabel}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("country.select.placeholder")}
          value={open ? query : selected ? countryLabel(selected) : query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => openList(true)}
          onKeyDown={onKeyDown}
          className="min-h-12 w-full appearance-none rounded-full border-2 border-ink/15 bg-cream px-5 pr-10 text-base text-ink transition hover:border-tomato focus:border-tomato"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-soft"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("country.select.listAria")}
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl border-2 border-ink/10 bg-cream py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">
              {t("country.select.noMatch")}
            </li>
          ) : (
            filtered.map((country, index) => {
              const isActive = index === activeIndex;
              const isSelected = country.code === value;
              return (
                <li
                  key={country.code}
                  id={`${listboxId}-option-${country.code}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  className={`cursor-pointer px-4 py-2.5 text-base text-ink ${
                    isActive ? "bg-stamp/15" : "hover:bg-parchment-deep/60"
                  } ${isSelected ? "font-medium" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(country);
                  }}
                >
                  {countryLabel(country)}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
