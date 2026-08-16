import type { Region } from "@/types/content";
import { useT } from "@/i18n/LocaleContext";

type RegionSelectProps = {
  regions: Region[];
  value?: string;
  onSelect: (regionId: string) => void;
  onClear: () => void;
  id?: string;
  label?: string;
  tone?: "light" | "dark";
};

export function RegionSelect({
  regions,
  value = "",
  onSelect,
  onClear,
  id = "region-select",
  label,
  tone = "light",
}: RegionSelectProps) {
  const t = useT();
  const resolvedLabel = label ?? t("region.select.label");

  if (regions.length === 0) return null;

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-sm font-medium ${tone === "dark" ? "text-cream/85" : "text-ink-soft"}`}
      >
        {resolvedLabel}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) onClear();
            else onSelect(next);
          }}
          className="min-h-12 w-full appearance-none rounded-full border-2 border-ink/15 bg-cream px-5 pr-10 text-base text-ink transition hover:border-tomato focus:border-tomato"
        >
          <option value="">{t("region.select.all")}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
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
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}
