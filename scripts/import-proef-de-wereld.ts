#!/usr/bin/env tsx
/**
 * Import restaurants from a Proef de Wereld research-edition text export
 * into src/content/restaurants/curated.json.
 *
 * Usage:
 *   npm run agent:proef -- /path/to/proef-de-wereld.txt
 *   npm run agent:proef -- /path/to/Proef_de_Wereld.docx   # macOS textutil
 *
 * Only keeps Netherlands venues with OSM cuisine tags (evidence A–C).
 * Skips shops, travel fallbacks abroad, community events, and duplicates.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { OSM_CUISINE_BY_COUNTRY } from "../src/restaurants/osmCuisineMap.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURATED_PATH = path.join(rootDir, "src/content/restaurants/curated.json");
const REVIEW_SOURCE = "proef-de-wereld-0.9";

const curatedSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    postcode: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    cuisineCodes: z.array(z.string()),
    cuisineTags: z.array(z.string()),
    website: z.string().nullable().optional(),
    authenticityRating: z.number(),
    authenticityNotes: z.string(),
    reviewSource: z.string(),
    userRating: z.number().optional(),
    reviewCount: z.number().optional(),
    ratings: z.unknown().optional(),
  }),
);

const FIELD_KEYS = new Set([
  "Rol",
  "Afstand vanaf Leiden",
  "Afstand",
  "Prijs",
  "Scores",
  "Sfeer",
  "Bestellen",
  "Reserveren",
  "Website",
  "Foto",
]);

const ABROAD_RE =
  /Belgi[eë]|Duitsland|Frankrijk|Brussel|Antwerpen|Keulen|Aken|Gent|Luik|Köln|Cologne|Paris|Düsseldorf|,\s*Cuba|,\s*UK|Verenigd Koninkrijk|Londen|London|Dublin|Kopenhagen|Helsinki|Boedapest|Montreal|Santiago|Phnom Penh|Havana,\s*Cuba/i;

const SHOP_RE =
  /winkel|supermarkt|markt|toko|afhaalbron|pop-?up|festival|vereniging|catering|foodtruck/i;

const DROP_NAME_RE =
  /community-events|keukenfallback|restaurantselectie|IKEA|ambassade|cooking event|TastyTalks/i;

const DROP_ROLE_RE = /reisfallback|in het land zelf|tijdelijke keuze/i;

const NL_CITY_RE =
  /amsterdam|rotterdam|den\s*haag|gravenhage|leiden|delft|utrecht|eindhoven|haarlem|groningen|tilburg|breda|nijmegen|arnhem|zwolle|maastricht|almere|zaandam|hilversum|scheveningen|gouda|dordrecht|voorschoten|wassenaar|katwijk|noordwijk|oegstgeest|rijswijk|voorburg|zoetermeer|amstelveen|alkmaar|hoofddorp|tiel|veendam|haren|helmond|nuenen|amersfoort|apeldoorn|enschede|leeuwarden|wageningen|ede|deventer|schiedam|vlaardingen|alphen|nieuwegein|zeist|randstad|holland|nederland|regio/i;

type ParsedPlace = {
  countryCode: string;
  countryName: string;
  name: string;
  place: string;
  role: string;
  auth10: number | null;
  evidence: string | null;
  website: string | null;
  order: string;
  vibe: string;
};

function loadText(inputPath: string): string {
  const abs = path.resolve(inputPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  if (abs.toLowerCase().endsWith(".docx")) {
    const tmp = path.join(os.tmpdir(), `proef-de-wereld-${Date.now()}.txt`);
    execFileSync("textutil", ["-convert", "txt", "-output", tmp, abs], {
      stdio: "pipe",
    });
    const text = fs.readFileSync(tmp, "utf8");
    fs.unlinkSync(tmp);
    return text;
  }
  return fs.readFileSync(abs, "utf8");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "place";
}

function normName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^restaurant\s+/, "")
    .replace(/[^a-z0-9]+/g, "");
}

function authToFive(score10: number | null): number {
  if (score10 == null) return 3;
  return Math.max(1, Math.min(5, Math.floor((score10 + 1) / 2)));
}

function cityFromPlace(place: string): string {
  let city = place.replace(/^regio\s+/i, "").trim();
  if (city.includes(",")) city = city.split(",")[0]!.trim();
  if (city.includes("/")) city = city.split("/")[0]!.trim();
  return city;
}

function parsePlaces(text: string): ParsedPlace[] {
  const lines = text.split(/\r?\n/);
  const countries: { code: string; name: string; start: number }[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const code = lines[i]!.trim();
    if (!/^[A-Z]{2}$/.test(code) || i + 2 >= lines.length) continue;
    const name = lines[i + 1]!.trim();
    if (lines[i + 2]!.trim() === "Hoofdstad" && name.length > 2) {
      countries.push({ code: code.toLowerCase(), name, start: i });
    }
  }

  const out: ParsedPlace[] = [];

  for (let ci = 0; ci < countries.length; ci += 1) {
    const country = countries[ci]!;
    const end = countries[ci + 1]?.start ?? lines.length;
    const block = lines.slice(country.start, end);
    const wi = block.findIndex((l) => l.trim() === "Waar proef je dit?");
    if (wi < 0) continue;

    let section = block.slice(wi + 1);
    const stop = section.findIndex((l) => l.trim().startsWith("Bronnen"));
    if (stop >= 0) section = section.slice(0, stop);

    const starts: { index: number; name: string; place: string }[] = [];
    for (let i = 0; i < section.length; i += 1) {
      const line = section[i]!.trim();
      if (!line || line.startsWith("Eerlijk oordeel")) continue;
      const match = /^(?:\d+\.\s+)?(.+?)\s+-\s+(.+)$/.exec(line);
      if (!match) continue;
      const next = section
        .slice(i + 1, i + 4)
        .map((l) => l.trim())
        .find(Boolean);
      if (next === "Rol") {
        starts.push({
          index: i,
          name: match[1]!.trim(),
          place: match[2]!.trim(),
        });
      }
    }

    for (let si = 0; si < starts.length; si += 1) {
      const start = starts[si]!;
      const endIndex = starts[si + 1]?.index ?? section.length;
      const body = section.slice(start.index + 1, endIndex);
      const fields: Record<string, string> = {};
      let current: string | null = null;
      for (const raw of body) {
        const line = raw.trim();
        if (FIELD_KEYS.has(line)) {
          current = line;
          fields[current] = "";
        } else if (current && line) {
          fields[current] = fields[current]
            ? `${fields[current]} ${line}`
            : line;
        }
      }

      const scores = fields.Scores ?? "";
      const authMatch = /Authenticiteit\s+(\d+)\/10/i.exec(scores);
      const evidenceMatch = /bewijs\s+([A-E])/i.exec(scores);
      let website = (fields.Website ?? "").trim() || null;
      if (website && !/^https?:\/\//i.test(website)) website = null;

      out.push({
        countryCode: country.code,
        countryName: country.name,
        name: start.name,
        place: start.place,
        role: fields.Rol ?? "",
        auth10: authMatch ? Number(authMatch[1]) : null,
        evidence: evidenceMatch ? evidenceMatch[1]!.toUpperCase() : null,
        website,
        order: fields.Bestellen ?? "",
        vibe: fields.Sfeer ?? "",
      });
    }
  }

  return out;
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(
      "Usage: npm run agent:proef -- <proef-de-wereld.txt|Proef_de_Wereld.docx>",
    );
    process.exit(1);
  }

  const text = loadText(input);
  const parsed = parsePlaces(text);
  const existing = curatedSchema.parse(
    JSON.parse(fs.readFileSync(CURATED_PATH, "utf8")),
  );

  // Replace previous Proef imports; dedupe only against non-Proef curated rows.
  const retained = existing.filter((e) => e.reviewSource !== REVIEW_SOURCE);

  const keys = new Set<string>();
  for (const place of retained) {
    for (const code of place.cuisineCodes) {
      keys.add(`${normName(place.name)}|${code}`);
    }
  }

  const added: z.infer<typeof curatedSchema> = [];
  const skipped = {
    abroad: 0,
    shop: 0,
    noOsm: 0,
    dup: 0,
    evidence: 0,
    junk: 0,
    nonNl: 0,
    lowAuth: 0,
  };

  for (const place of parsed) {
    if (ABROAD_RE.test(place.place) || ABROAD_RE.test(place.role)) {
      skipped.abroad += 1;
      continue;
    }
    if (SHOP_RE.test(place.role) || SHOP_RE.test(place.name)) {
      skipped.shop += 1;
      continue;
    }
    if (place.evidence === "D" || place.evidence === "E") {
      skipped.evidence += 1;
      continue;
    }
    if (DROP_NAME_RE.test(place.name) || DROP_ROLE_RE.test(place.role)) {
      skipped.junk += 1;
      continue;
    }

    const tags = OSM_CUISINE_BY_COUNTRY[place.countryCode];
    if (!tags?.length) {
      skipped.noOsm += 1;
      continue;
    }

    const city = cityFromPlace(place.place);
    if (!NL_CITY_RE.test(city) && !NL_CITY_RE.test(place.place)) {
      skipped.nonNl += 1;
      continue;
    }

    const auth5 = authToFive(place.auth10);
    if (auth5 <= 1) {
      skipped.lowAuth += 1;
      continue;
    }

    const key = `${normName(place.name)}|${place.countryCode}`;
    if (keys.has(key)) {
      skipped.dup += 1;
      continue;
    }

    const evidence = place.evidence ?? "?";
    const notes = [
      `Proef de Wereld 0.9 (${evidence}): ${place.role || "Research guide pick"}.`,
      place.vibe ? `${place.vibe.replace(/\.$/, "")}.` : "",
      place.order ? `Try: ${place.order.replace(/\.$/, "")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const entry = {
      id: `curated:proef-${place.countryCode}-${slugify(place.name)}-${slugify(city)}`,
      name: place.name,
      address: city,
      city,
      postcode: null,
      lat: null,
      lng: null,
      cuisineCodes: [place.countryCode],
      cuisineTags: [tags[0]!],
      website: place.website,
      authenticityRating: auth5,
      authenticityNotes:
        notes.length >= 20
          ? notes.slice(0, 500)
          : `Proef de Wereld research pick for ${place.countryName} cuisine in ${city}.`,
      reviewSource: REVIEW_SOURCE,
    };

    let id = entry.id;
    let n = 2;
    const usedIds = new Set([
      ...retained.map((e) => e.id),
      ...added.map((e) => e.id),
    ]);
    while (usedIds.has(id)) {
      id = `${entry.id}-${n}`;
      n += 1;
    }
    entry.id = id;

    added.push(entry);
    keys.add(key);
  }

  const merged = [...retained, ...added];
  fs.writeFileSync(CURATED_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  console.log(`Parsed ${parsed.length} guide entries`);
  console.log(`Added ${added.length} Netherlands restaurants to curated.json`);
  console.log(`Skipped: ${JSON.stringify(skipped)}`);
  console.log(`curated.json now has ${merged.length} places`);
  console.log("Next: npm run agent:curate");
}

main();
