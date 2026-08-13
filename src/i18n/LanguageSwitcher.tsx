import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";

type LanguageSwitcherProps = {
  tone?: "light" | "dark";
};

export function LanguageSwitcher({ tone = "light" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const options: Locale[] = ["en", "nl"];

  return (
    <div
      role="group"
      aria-label={t("app.lang.switchAria")}
      className={`inline-flex overflow-hidden rounded-full text-sm font-semibold ring-1 ${
        tone === "dark"
          ? "ring-cream/30 text-cream"
          : "ring-burgundy/20 text-burgundy"
      }`}
    >
      {options.map((option) => {
        const active = locale === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(option)}
            className={`min-h-9 min-w-10 px-2.5 transition ${
              active
                ? tone === "dark"
                  ? "bg-cream text-burgundy"
                  : "bg-burgundy text-cream"
                : tone === "dark"
                  ? "hover:bg-cream/15"
                  : "hover:bg-burgundy/5"
            }`}
          >
            {t(`app.lang.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
