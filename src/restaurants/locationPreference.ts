const REMEMBER_KEY = "spoonspin:remember-city";
const CITY_KEY = "spoonspin:dine-city";
const COORDS_KEY = "spoonspin:dine-coords";

/** Default "Search near …" / order-discovery city when none is saved. */
export const DEFAULT_DINE_CITY = "Leiden";

export type SavedCoords = { lat: number; lng: number };

/** Saved dine city, or the app default (Leiden). */
export function getPreferredDineCity(): string {
  return getSavedDineCity() ?? DEFAULT_DINE_CITY;
}

export function getRememberCityPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRememberCityPreference(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
      window.localStorage.removeItem(CITY_KEY);
      window.localStorage.removeItem(COORDS_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function getSavedDineCity(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CITY_KEY)?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

export function getSavedDineCoords(): SavedCoords | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(COORDS_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as SavedCoords).lat !== "number" ||
      typeof (parsed as SavedCoords).lng !== "number"
    ) {
      return undefined;
    }
    return parsed as SavedCoords;
  } catch {
    return undefined;
  }
}

export function saveDineLocation(cityOrPostcode: string, coords?: SavedCoords): void {
  if (typeof window === "undefined") return;
  const city = cityOrPostcode.trim();
  if (!city) return;
  try {
    window.localStorage.setItem(CITY_KEY, city);
    if (coords) {
      window.localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
    } else {
      window.localStorage.removeItem(COORDS_KEY);
    }
  } catch {
    // ignore
  }
}
