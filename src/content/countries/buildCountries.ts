import type { Country, CountryCatalogEntry, WikipediaCuisine } from "@/types/content";
import { countryCatalog } from "./catalog";
import { authoredCountries } from "./published";
import wikipediaCuisines from "./wikipediaCuisines.json" with { type: "json" };

const wikiByCode = wikipediaCuisines as Record<string, WikipediaCuisine>;

const authoredByCode = new Map(
  authoredCountries.map((country) => [country.code, country]),
);

function stubIntroduction(entry: CountryCatalogEntry, wiki?: WikipediaCuisine): string {
  if (wiki?.summary) return wiki.summary;
  return `${entry.name} has a distinctive food culture. Spin again later for a full home-cooking menu, or dine out in the Netherlands while we keep expanding recipes.`;
}

function buildCountry(entry: CountryCatalogEntry): Country {
  const wiki = wikiByCode[entry.code];
  const authored = authoredByCode.get(entry.code);

  if (authored) {
    return {
      ...authored,
      wikipedia: wiki,
      cookReady: true,
      status: "published",
    };
  }

  return {
    code: entry.code,
    slug: entry.slug,
    name: entry.name,
    flag: entry.flag,
    region: entry.region,
    introduction: stubIntroduction(entry, wiki),
    wikipedia: wiki,
    cuisineAliases: [
      `${entry.name} restaurant`,
      `${entry.name} cuisine`,
      `${entry.name} food`,
    ],
    cookReady: false,
    status: "published",
  };
}

/** Every catalog country, spinable worldwide. */
export const allCountries: Country[] = countryCatalog.map(buildCountry);

export function getCookReadyCountries(): Country[] {
  return allCountries.filter((country) => country.cookReady);
}
