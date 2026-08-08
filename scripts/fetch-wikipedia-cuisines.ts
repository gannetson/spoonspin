/**
 * Fetch Wikipedia cuisine summaries for every catalog country.
 *
 * Usage: npm run content:wikipedia
 *
 * Writes data/wikipedia-cuisines.json
 * Uses the Wikipedia REST summary API (CC BY-SA).
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { countryCatalog } from "../src/content/countries/catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/wikipedia-cuisines.json");
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; cuisine summaries)";

/** Prefer these article titles over the default "{Name} cuisine". */
const TITLE_OVERRIDES: Record<string, string[]> = {
  us: ["American cuisine", "Cuisine of the United States"],
  gb: ["British cuisine", "Cuisine of the United Kingdom"],
  ae: ["Emirati cuisine", "Cuisine of the United Arab Emirates"],
  cz: ["Czech cuisine"],
  sk: ["Slovak cuisine"],
  kp: ["North Korean cuisine", "Korean cuisine"],
  kr: ["Korean cuisine", "South Korean cuisine"],
  cd: ["Congolese cuisine", "Cuisine of the Democratic Republic of the Congo"],
  cg: ["Congolese cuisine", "Cuisine of the Republic of the Congo"],
  ci: ["Ivorian cuisine", "Cuisine of Ivory Coast"],
  mk: ["Macedonian cuisine", "Cuisine of North Macedonia"],
  sz: ["Swazi cuisine", "Cuisine of Eswatini"],
  tl: ["East Timorese cuisine", "Cuisine of East Timor", "Cuisine of Timor-Leste"],
  va: ["Vatican City", "Roman cuisine", "Italian cuisine"],
  ps: ["Palestinian cuisine"],
  xk: ["Kosovan cuisine", "Cuisine of Kosovo", "Albanian cuisine"],
  tw: ["Taiwanese cuisine"],
  ru: ["Russian cuisine"],
  cn: ["Chinese cuisine"],
  bn: ["Bruneian cuisine", "Cuisine of Brunei"],
  mh: ["Marshallese cuisine", "Cuisine of the Marshall Islands"],
  fm: [
    "Cuisine of the Federated States of Micronesia",
    "Micronesian cuisine",
  ],
  st: ["São Toméan cuisine", "Cuisine of São Tomé and Príncipe"],
  ag: ["Antigua and Barbuda cuisine", "Cuisine of Antigua and Barbuda"],
  tt: ["Trinidad and Tobago cuisine"],
  kn: ["Cuisine of Saint Kitts and Nevis", "Kittitian cuisine"],
  vc: [
    "Cuisine of Saint Vincent and the Grenadines",
    "Vincentian cuisine",
  ],
  lc: ["Cuisine of Saint Lucia", "Saint Lucian cuisine"],
  gd: ["Grenadian cuisine", "Cuisine of Grenada"],
  dm: ["Dominican cuisine", "Cuisine of Dominica"],
  do: ["Dominican Republic cuisine", "Cuisine of the Dominican Republic"],
  cv: ["Cape Verdean cuisine", "Cuisine of Cape Verde", "Cuisine of Cabo Verde"],
  ki: ["Cuisine of Kiribati", "I-Kiribati cuisine"],
  ad: ["Andorran cuisine", "Cuisine of Andorra"],
  gy: ["Guyanese cuisine", "Cuisine of Guyana"],
  ke: ["Kenyan cuisine", "Cuisine of Kenya"],
  pw: ["Cuisine of Palau", "Palauan cuisine"],
  ws: ["Samoan cuisine", "Cuisine of Samoa"],
  sr: ["Surinamese cuisine", "Cuisine of Suriname"],
  tz: ["Tanzanian cuisine", "Cuisine of Tanzania"],
  to: ["Tongan cuisine", "Cuisine of Tonga"],
  zw: ["Zimbabwean cuisine", "Cuisine of Zimbabwe"],
  mm: ["Burmese cuisine", "Cuisine of Myanmar"],
  ph: ["Filipino cuisine", "Philippine cuisine"],
  nl: ["Dutch cuisine", "Cuisine of the Netherlands"],
};

type WikiSummary = {
  title: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
};

type Stored = { title: string; summary: string; url: string };

function titleCandidates(code: string, name: string): string[] {
  const overrides = TITLE_OVERRIDES[code] ?? [];
  return [
    ...overrides,
    `${name} cuisine`,
    `Cuisine of ${name}`,
  ];
}

function encodeTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeTitle(title)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Api-User-Agent": USER_AGENT,
      "User-Agent": USER_AGENT,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${title}: HTTP ${res.status}`);
  }
  return (await res.json()) as WikiSummary;
}

function looksLikeCuisinePage(title: string, summary: string): boolean {
  const haystack = `${title} ${summary}`.toLowerCase();
  if (/\b(cuisine|food|dish|dishes|cooking|culinary|recipe|recipes)\b/.test(haystack)) {
    return true;
  }
  return false;
}

async function resolveCuisine(
  code: string,
  name: string,
): Promise<Stored | null> {
  for (const title of titleCandidates(code, name)) {
    try {
      const page = await fetchSummary(title);
      if (!page) continue;
      if (page.type === "disambiguation") continue;
      const summary = (page.extract ?? page.description ?? "").trim();
      if (summary.length < 40) continue;
      if (!looksLikeCuisinePage(page.title, summary)) continue;
      const url =
        page.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeTitle(page.title)}`;
      return { title: page.title, summary, url };
    } catch (error) {
      console.warn(`  warn ${code}/${title}:`, error);
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const out: Record<string, Stored> = {};
  let hit = 0;
  let miss = 0;

  for (const [index, entry] of countryCatalog.entries()) {
    process.stdout.write(
      `[${index + 1}/${countryCatalog.length}] ${entry.code} ${entry.name}… `,
    );
    const found = await resolveCuisine(entry.code, entry.name);
    if (found) {
      out[entry.code] = found;
      hit += 1;
      console.log(`✓ ${found.title}`);
    } else {
      miss += 1;
      console.log("– no page");
    }
    await sleep(120);
  }

  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${OUT}`);
  console.log(`Found ${hit}, missing ${miss}, total ${countryCatalog.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
