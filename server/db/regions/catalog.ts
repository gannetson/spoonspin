import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Subdivision = {
  isoCode: string;
  name: string;
  type: string;
};

export type CountryRegionCatalog = {
  source: string;
  subdivisions: Subdivision[];
};

export type CountryRegionAliases = Record<string, string>;

const packageDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(packageDir, "data");
const aliasDir = join(packageDir, "aliases");

const catalogCache = new Map<string, CountryRegionCatalog>();
const aliasCache = new Map<string, CountryRegionAliases>();

function readJsonFile<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

export function loadCountryCatalog(countryCode: string): CountryRegionCatalog | undefined {
  const code = countryCode.toLowerCase();
  const cached = catalogCache.get(code);
  if (cached) return cached;

  const catalog = readJsonFile<CountryRegionCatalog>(join(dataDir, `${code}.json`));
  if (catalog) catalogCache.set(code, catalog);
  return catalog;
}

export function loadCountryAliases(countryCode: string): CountryRegionAliases {
  const code = countryCode.toLowerCase();
  const cached = aliasCache.get(code);
  if (cached) return cached;

  const aliases = readJsonFile<CountryRegionAliases>(join(aliasDir, `${code}.json`)) ?? {};
  aliasCache.set(code, aliases);
  return aliases;
}

export function findSubdivisionByIsoCode(
  countryCode: string,
  isoCode: string,
): Subdivision | undefined {
  const catalog = loadCountryCatalog(countryCode);
  return catalog?.subdivisions.find((entry) => entry.isoCode === isoCode);
}

export function findSubdivisionByName(
  countryCode: string,
  name: string,
): Subdivision | undefined {
  const catalog = loadCountryCatalog(countryCode);
  if (!catalog) return undefined;
  const normalized = normalizeRegionName(name);
  return catalog.subdivisions.find(
    (entry) => normalizeRegionName(entry.name) === normalized,
  );
}

export function normalizeRegionName(raw: string): string {
  return raw
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function regionIdFromIso(countryCode: string, isoCode: string): string {
  return `${countryCode.toLowerCase()}:${isoCode}`;
}

export function regionSlug(countryCode: string, canonicalName: string): string {
  const base = canonicalName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${countryCode.toLowerCase()}:${base || "region"}`;
}

export function regionIdFor(
  countryCode: string,
  canonicalName: string,
  isoCode?: string | null,
): string {
  if (isoCode) return regionIdFromIso(countryCode, isoCode);
  return regionSlug(countryCode, canonicalName);
}

export function resolveCanonicalRegionName(raw: string, countryCode: string): string {
  const normalized = normalizeRegionName(raw);
  if (!normalized) return raw.trim();

  const catalog = loadCountryCatalog(countryCode);
  if (catalog) {
    const aliases = loadCountryAliases(countryCode);
    const isoFromAlias = aliases[normalized];
    if (isoFromAlias) {
      const fromAlias = catalog.subdivisions.find((entry) => entry.isoCode === isoFromAlias);
      if (fromAlias) return fromAlias.name;
    }

    for (const entry of catalog.subdivisions) {
      if (normalizeRegionName(entry.name) === normalized) return entry.name;
    }
  }

  return titleCaseWords(raw.trim());
}

export function lookupIsoCode(countryCode: string, canonicalName: string): string | undefined {
  return findSubdivisionByName(countryCode, canonicalName)?.isoCode;
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** @internal Test helper — clears cached JSON reads. */
export function clearRegionCatalogCache(): void {
  catalogCache.clear();
  aliasCache.clear();
}
