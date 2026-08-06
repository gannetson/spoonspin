import type { Country } from "@/types/content";

const RECENT_KEY = "spoonspin:recent-countries";
const MAX_RECENT = 5;

export function getRecentCountryCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberCountryCode(code: string): void {
  if (typeof window === "undefined") return;
  const previous = getRecentCountryCodes().filter((c) => c !== code);
  const next = [code, ...previous].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function pickRandomCountry(
  countries: Country[],
  recentCodes: string[] = [],
  random: () => number = Math.random,
): Country {
  const published = countries.filter((c) => c.status === "published");
  if (published.length === 0) {
    throw new Error("No published countries available");
  }

  const avoid = new Set(recentCodes.slice(0, MAX_RECENT));
  const eligible =
    published.length > avoid.size
      ? published.filter((c) => !avoid.has(c.code))
      : published;

  const index = Math.floor(random() * eligible.length);
  return eligible[index]!;
}

export { MAX_RECENT };
