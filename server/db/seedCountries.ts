import type { Pool } from "pg";
import { ensureDb } from "./restaurants.ts";

/** Minimal published countries for local/dev databases. */
export const SEED_COUNTRIES = [
  {
    code: "nl",
    slug: "netherlands",
    name: "Netherlands",
    flag: "🇳🇱",
    region: "Europe",
    introduction:
      "Dutch cuisine blends hearty comfort food with Indonesian and colonial influences — think stamppot, bitterballen, and rijsttafel at home.",
    cuisineAliases: ["Dutch restaurant", "Dutch cuisine", "Netherlands food"],
  },
  {
    code: "it",
    slug: "italy",
    name: "Italy",
    flag: "🇮🇹",
    region: "Europe",
    introduction:
      "Italian cooking celebrates regional ingredients — pasta, risotto, antipasti, and slow-simmered sauces built around olive oil, tomatoes, and fresh herbs.",
    cuisineAliases: ["Italian restaurant", "Italian cuisine", "Italy food"],
  },
  {
    code: "cn",
    slug: "china",
    name: "China",
    flag: "🇨🇳",
    region: "Asia",
    introduction:
      "Chinese cuisine spans many provinces — from Sichuan heat and Cantonese dim sum to northern noodles and coastal seafood.",
    cuisineAliases: ["Chinese restaurant", "Chinese cuisine", "China food"],
  },
  {
    code: "mx",
    slug: "mexico",
    name: "Mexico",
    flag: "🇲🇽",
    region: "Americas",
    introduction:
      "Mexican food layers corn, chiles, beans, and citrus into tacos, moles, and salsas with deep indigenous and Spanish roots.",
    cuisineAliases: ["Mexican restaurant", "Mexican cuisine", "Mexico food"],
  },
  {
    code: "jp",
    slug: "japan",
    name: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    introduction:
      "Japanese cuisine balances umami-rich broths, pristine seafood, rice, and seasonal vegetables — from ramen and curry to home-style donburi.",
    cuisineAliases: ["Japanese restaurant", "Japanese cuisine", "Japan food"],
  },
] as const;

export async function seedDevCountries(db?: Pool): Promise<number> {
  const pool = db ?? (await ensureDb());
  let inserted = 0;

  for (const country of SEED_COUNTRIES) {
    const result = await pool.query(
      `INSERT INTO countries (
        code, slug, name, flag, region, introduction, cuisine_aliases,
        cook_ready, status, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb,
        FALSE, 'published', NOW()
      )
      ON CONFLICT (code) DO NOTHING`,
      [
        country.code,
        country.slug,
        country.name,
        country.flag,
        country.region,
        country.introduction,
        JSON.stringify(country.cuisineAliases),
      ],
    );
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}
