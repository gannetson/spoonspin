export type Locale = "en" | "nl";

export const LOCALES: Locale[] = ["en", "nl"];

export const LOCALE_STORAGE_KEY = "spoonspin_locale";

export type MessageVars = Record<string, string | number>;

/** Flat message catalogs — keep keys identical across locales. */
export type Messages = Record<string, string>;

export function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] == null ? `{${key}}` : String(vars[key]),
  );
}

export function detectInitialLocale(): Locale {
  // Language switcher is temporarily hidden — English only.
  return "en";
}
