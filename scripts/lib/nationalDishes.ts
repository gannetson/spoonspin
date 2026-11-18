/**
 * National dishes per country, from Wikipedia's "National dish" article ("By country"
 * section: `* [[Country]]: [[dish]], [[dish]]`).
 *
 * The article says itself that it is "not a definitive list of national dishes, but
 * rather a list of some foods that have been suggested". So these are *hints* handed to
 * the recipe discovery prompt, which keeps only the ones that are genuinely from the
 * cuisine; they are never stored as an official designation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countryCatalog } from "../../src/content/countries/catalog.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const NATIONAL_DISHES_PATH = path.join(rootDir, "data", "national-dishes.json");
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; national dish research)";
const CACHE_DAYS = 90;
const MAX_DISHES_PER_COUNTRY = 8;

export type NationalDishFile = {
  fetchedAt: string;
  /** ISO-2 code (lower case) to dish names, most prominent first. */
  byCode: Record<string, string[]>;
};

/** Names Wikipedia uses that differ from our catalog names (both normalized). */
const COUNTRY_ALIASES: Record<string, string> = {
  "czech republic": "czechia",
  "the bahamas": "bahamas",
  "the gambia": "gambia",
  burma: "myanmar",
  "ivory coast": "cote d'ivoire",
  "east timor": "timor-leste",
  swaziland: "eswatini",
  macedonia: "north macedonia",
  "republic of the congo": "congo",
  "cape verde": "cabo verde",
  "united states of america": "united states",
  usa: "united states",
  uk: "united kingdom",
  england: "united kingdom",
  scotland: "united kingdom",
  wales: "united kingdom",
  "northern ireland": "united kingdom",
  "british cuisine": "united kingdom",
  "english cuisine": "united kingdom",
  "scottish cuisine": "united kingdom",
  "welsh cuisine": "united kingdom",
  "irish cuisine": "ireland",
  "korea north": "north korea",
  "korea south": "south korea",
  "georgia (country)": "georgia",
  vatican: "vatican city",
  "palestinian territories": "palestine",
  "state of palestine": "palestine",
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogCodeByName(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of countryCatalog) map.set(normalizeName(entry.name), entry.code);
  return map;
}

/** Remove refs, templates and comments from a wikitext fragment. */
function stripMarkup(text: string): string {
  let out = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  // Templates may nest one level deep; two passes handle {{a|{{b}}}}.
  for (let i = 0; i < 2; i += 1) out = out.replace(/\{\{[^{}]*\}\}/g, "");
  return out.replace(/'{2,}/g, "").replace(/<[^>]+>/g, "");
}

/** Split on commas and semicolons that are not inside [[...]]. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    const two = text.slice(i, i + 2);
    if (two === "[[") {
      depth += 1;
      current += two;
      i += 1;
    } else if (two === "]]") {
      depth = Math.max(0, depth - 1);
      current += two;
      i += 1;
    } else if ((text[i] === "," || text[i] === ";") && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += text[i];
    }
  }
  parts.push(current);
  return parts;
}

function dishName(piece: string): string | null {
  const name = piece
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(and|or)\s+/i, "")
    .replace(/[.:]+$/, "")
    .trim();
  if (name.length < 3 || name.length > 60) return null;
  if (/https?:|www\.|^\W+$/.test(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Parse the "By country" section of the National dish article. Countries that cannot be
 * matched to the catalog are skipped and returned in `unmatched`.
 */
export function parseNationalDishes(
  wikitext: string,
  codeByName: Map<string, string> = catalogCodeByName(),
): { byCode: Record<string, string[]>; unmatched: string[] } {
  const start = wikitext.search(/==\s*By country\s*==/i);
  const section = start >= 0 ? wikitext.slice(start) : wikitext;
  const end = section.slice(2).search(/\n==[^=]/);
  const body = end >= 0 ? section.slice(0, end + 2) : section;

  const byCode: Record<string, string[]> = {};
  const unmatched: string[] = [];
  for (const line of body.split("\n")) {
    // Either "[[Spain]]" or "[[Cuisine of Spain|Spain]]": use the shown text, then drop "cuisine of".
    const match = /^\*{1,2}\s*\[\[([^\]|]+)(?:\|([^\]]*))?\]\]\s*:\s*(.+)$/.exec(line);
    if (!match) continue;
    const country = normalizeName((match[2] || match[1]!).replace(/^cuisine of\s+/i, ""));
    const code = codeByName.get(country) ?? codeByName.get(COUNTRY_ALIASES[country] ?? "");
    if (!code) {
      unmatched.push((match[2] || match[1]!).trim());
      continue;
    }
    const dishes: string[] = [...(byCode[code] ?? [])];
    for (const piece of splitTopLevel(stripMarkup(match[3]!))) {
      const name = dishName(piece);
      if (name && !dishes.some((d) => d.toLowerCase() === name.toLowerCase())) dishes.push(name);
      if (dishes.length >= MAX_DISHES_PER_COUNTRY) break;
    }
    if (dishes.length > 0) byCode[code] = dishes;
  }
  return { byCode, unmatched };
}

async function fetchWikitext(): Promise<string> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "parse",
      page: "National_dish",
      prop: "wikitext",
      format: "json",
      formatversion: "2",
    });
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
  const data = (await response.json()) as { parse?: { wikitext?: string } };
  const text = data.parse?.wikitext;
  if (!text) throw new Error("Wikipedia returned no wikitext for National dish");
  return text;
}

function readCache(): NationalDishFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(NATIONAL_DISHES_PATH, "utf8")) as NationalDishFile;
    return parsed && typeof parsed.byCode === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * National dish hints for every catalog country. Cached under data/ for 90 days; if
 * Wikipedia cannot be reached, a stale cache (or nothing) is used instead of failing.
 */
export async function loadNationalDishes(
  options: { refresh?: boolean } = {},
): Promise<Record<string, string[]>> {
  const cached = readCache();
  const fresh =
    cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_DAYS * 86_400_000;
  if (cached && fresh && !options.refresh) return cached.byCode;
  try {
    const { byCode, unmatched } = parseNationalDishes(await fetchWikitext());
    fs.mkdirSync(path.dirname(NATIONAL_DISHES_PATH), { recursive: true });
    const file: NationalDishFile = { fetchedAt: new Date().toISOString(), byCode };
    fs.writeFileSync(NATIONAL_DISHES_PATH, `${JSON.stringify(file, null, 2)}\n`);
    console.log(
      `National dishes: ${Object.keys(byCode).length} countries from Wikipedia` +
        (unmatched.length > 0 ? ` (${unmatched.length} names not in catalog)` : ""),
    );
    return byCode;
  } catch (error) {
    console.warn("Could not refresh national dishes from Wikipedia:", error);
    return cached?.byCode ?? {};
  }
}
