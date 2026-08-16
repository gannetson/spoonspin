import type { Country, Region } from "@/types/content";

export async function fetchCountries(): Promise<Country[]> {
  const response = await fetch("/api/countries", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Could not load countries from the server.");
  }
  const data = (await response.json()) as { countries?: Country[] };
  return data.countries ?? [];
}

export async function fetchCountry(code: string): Promise<Country | null> {
  const response = await fetch(`/api/countries/${encodeURIComponent(code)}`, {
    credentials: "include",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Could not load country.");
  }
  const data = (await response.json()) as { country?: Country };
  return data.country ?? null;
}

export async function fetchRegions(countryCode: string): Promise<Region[]> {
  const response = await fetch(
    `/api/countries/${encodeURIComponent(countryCode)}/regions`,
    { credentials: "include" },
  );
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { regions?: Region[] };
  return data.regions ?? [];
}
