#!/usr/bin/env tsx
import "dotenv/config";
import {
  closeDb,
  countByCuisineCode,
  getDb,
} from "../server/db/restaurants.ts";
import { osmTagsForCountry } from "../src/restaurants/osmCuisineMap.ts";
import { publishedCountries } from "../src/content/countries/published.ts";
import {
  HUBS,
  harvestCountryAtHub,
  sleep,
  type Hub,
} from "./lib/overpassRestaurants.ts";

type CliOptions = {
  hubs: Hub[];
  radiusKm: number;
  delayMs: number;
  countries: string[];
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    hubs: HUBS.randstad!,
    radiusKm: 20,
    delayMs: 4000,
    countries: publishedCountries.map((c) => c.code),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--hubs" && next) {
      const preset = HUBS[next.toLowerCase()];
      if (!preset) {
        throw new Error(
          `Unknown hubs preset "${next}". Use: ${Object.keys(HUBS).join(", ")}`,
        );
      }
      options.hubs = preset;
      i += 1;
    } else if (arg === "--lat" && next && argv[i + 2] === "--lng" && argv[i + 3]) {
      options.hubs = [
        {
          id: "custom",
          name: "Custom",
          lat: Number(next),
          lng: Number(argv[i + 3]),
        },
      ];
      i += 3;
    } else if (arg === "--radius-km" && next) {
      options.radiusKm = Number(next);
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Number(next);
      i += 1;
    } else if (arg === "--countries" && next) {
      options.countries = next.split(",").map((c) => c.trim().toLowerCase());
      i += 1;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  getDb();

  console.log(
    `Spoon Spin restaurant agent — hubs: ${options.hubs.map((h) => h.name).join(", ")} r=${options.radiusKm}km`,
  );
  console.log(`Countries: ${options.countries.join(", ")}`);

  const perCountry: Record<string, number> = {};

  for (const code of options.countries) {
    if (osmTagsForCountry(code).length === 0) {
      console.log(`Skip ${code}: no OSM cuisine mapping`);
      perCountry[code] = 0;
      continue;
    }

    let total = 0;
    for (const hub of options.hubs) {
      process.stdout.write(`Harvesting ${code} @ ${hub.name}… `);
      try {
        const count = await harvestCountryAtHub({
          countryCode: code,
          hub,
          radiusKm: options.radiusKm,
        });
        total += count;
        console.log(`${count} places`);
      } catch (error) {
        console.log("failed");
        console.error(error);
      }
      await sleep(options.delayMs);
    }
    perCountry[code] = total;
  }

  console.log("\nUpserts this run (sum across hubs):");
  for (const [code, count] of Object.entries(perCountry)) {
    console.log(`  ${code}: ${count}`);
  }

  console.log("\nReviewed coverage by cuisine:");
  const totals = countByCuisineCode();
  for (const code of options.countries) {
    console.log(`  ${code}: ${totals[code] ?? 0}`);
  }

  closeDb();
}

main().catch((error) => {
  console.error(error);
  closeDb();
  process.exit(1);
});
