import type { Country } from "@/types/content";

type CountrySelectProps = {
  countries: Country[];
  value?: string;
  onSelect: (code: string) => void;
  id?: string;
  label?: string;
  /** Use on dark photo backgrounds (hero). */
  tone?: "light" | "dark";
};

export function CountrySelect({
  countries,
  value = "",
  onSelect,
  id = "country-select",
  label = "Or choose a country",
  tone = "light",
}: CountrySelectProps) {
  const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-sm font-medium ${tone === "dark" ? "text-cream/85" : "text-ink-soft"}`}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const code = event.target.value;
          if (code) onSelect(code);
        }}
        className="min-h-12 w-full appearance-none rounded-full border-2 border-ink/15 bg-cream px-5 pr-10 text-base text-ink transition hover:border-tomato focus:border-tomato"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233d4f48' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 1rem center",
        }}
      >
        <option value="" disabled>
          Select a country…
        </option>
        {sorted.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}
