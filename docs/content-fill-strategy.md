# Content fill strategy (all countries × NL, Belgium, western Germany)

Goal: steadily fill **recipes / dinners / images**, **restaurants**, and **order options** for every published cuisine, for the Netherlands and its neighbours.

- **Restaurants:** the whole of the Netherlands, Belgium and western Germany (Aachen, Köln, Düsseldorf, the Ruhr), as map tiles.
- **Order options:** delivery cities, city by city. The five Randstad hubs first (Leiden, Amsterdam, Rotterdam, Den Haag, Utrecht), then Antwerpen, Brussel, Aachen, Köln, Düsseldorf, Gent, Eindhoven and the rest of `FILL_CITIES_ORDERED` in [`src/restaurants/coverage.ts`](../src/restaurants/coverage.ts).

Regions, city anchors and "which country is this point in" all come from that one file.

## One run finishes things

The lanes used to be a chain of separate scripts, each leaving gaps for the next to fill. Now a run finishes what it starts:

| Lane | One run does |
|------|--------------|
| **cook** | per country: Wikipedia dish research → 35-recipe menu with national dishes flagged → a photo and links for every recipe → a dinner that only uses recipes that exist → country image |
| **restaurants** | next map tiles → store places (never overwriting reviewed rows) → promote → per restaurant: cuisine verdict + description, photo, menu, scores, Google/Tripadvisor rating |
| **orders** | Apify jobs per country × city: Thuisbezorgd (NL) / Takeaway.com (BE) / Lieferando (DE) plus Uber Eats, then notes and cuisine verification |
| **daily** | all three, small batches |

## Orchestrator

```bash
# Progress / gaps
npm run agent:fill -- --status

# Cron-friendly: one small batch of each lane
npm run agent:fill -- --lane daily --batch 3

# Individual lanes
npm run agent:fill -- --lane cook --batch 3
npm run agent:fill -- --lane restaurants --batch 4        # tiles per run = max(batch × 4, 8)
npm run agent:fill -- --lane orders --batch 3

# One country / subset of cities
npm run agent:fill -- --lane orders --code it --cities Antwerpen,Aachen
npm run agent:cook -- --code gb                            # one country, every step, all regions
npm run agent:cook -- --code gb --force                    # rebuild even if it looks complete
```

Progress for fill lanes is stored in Postgres (`content_fill_progress`) so cron on a content machine and the API share the same truth via `DATABASE_URL`. Local JSON under `data/` is a CLI cache/backup only.

Admins can inspect gaps on **`/admin`** (Content fill panel). The order matrix there still shows the five Randstad hubs; the CLI works through all cities.

After new order options are saved, and after gather promotes restaurants, OpenAI enrichment runs. Enrichment may **reassign** cuisine countries from page evidence, or **remove** restaurants / order options when evidence was fetched but cuisine remains unclear.

## Restaurants (tiles)

- The map is cut into 0.5° tiles on one shared grid; a tile is one Overpass request for every cuisine at once. A tile that times out is split into four.
- A tile is *done* when it was searched with today's set of cuisine tags; it becomes due again when a country is published or after `--refresh-days` (default 30).
- Promotion (`--promote-limit`, default 400 per run) and enrichment happen in the same run. Restaurants an earlier run promoted but never enriched (no OpenAI key that day, a crash, more promotions than one run could enrich) are picked up too (`--finish-limit`, default 200).
- Ratings need `GOOGLE_PLACES_API_KEY` and/or `TRIPADVISOR_API_KEY`; without them that step is skipped. Photos fall back to Wikimedia when there is no Google key, which is thin for restaurants.

## Recipes and national dishes

- Target: **35 full recipes per country** (`COOK_TARGET_RECIPES` to change, see `server/lib/cookTargets.ts`), plus about 4 per administrative region where a region catalog exists.
- **National dishes:** Wikipedia's "National dish" article is parsed into hints per country (`data/national-dishes.json`, refreshed every 90 days). The model keeps the ones that are genuinely from the cuisine and flags them (`recipes.is_national`). The article itself says its list is "some foods that have been suggested", so this is "widely regarded as", never an official designation. The main course of the core menu, and `national_dish_id`, prefer a flagged dish.
- **Photos:** Wikipedia lead image → Commons → Wikidata `image` → Openverse (CC, attribution stored) → TheMealDB only when `THEMEALDB_API_KEY` is set. A dish with no photo is retried after 14 days, not every run. Existing photos and admin uploads are never replaced.
- **Dinners** only count when at least 3 courses still point at a recipe that exists; `agent:compose-dinners -- --repair` rewrites the ones that do not.

## Recommended schedule

Stagger expensive Apify/Places work. Example crontab (user with DB access, not `www-data` deploy checkout if agents rewrite local `data/`):

```cron
# Cook menus, photos, dinners — morning (OpenAI)
15 6 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane cook --batch 3 >>/var/log/spoonspin-fill-cook.log 2>&1

# Restaurants — midday (OSM tiles, free but rate-limited)
15 12 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane restaurants --batch 4 >>/var/log/spoonspin-fill-restaurants.log 2>&1

# Order options — evening (Apify; 3 country×city jobs)
30 20 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane orders --batch 3 >>/var/log/spoonspin-fill-orders.log 2>&1
```

Or install the sample files under [`deploy/cron/`](../deploy/cron/) and [`deploy/systemd/`](../deploy/systemd/).

Check `agent:fill -- --status` after the first week: the cook lane had not run for months before this change, so make sure the timer is actually installed on the content machine.

Rough throughput:

- **Cook:** 3 countries a day to complete (about 200 countries need the extra recipes and photos, so weeks), plus a photo sweep over recipes anywhere.
- **Restaurants:** 16 tiles per run, about 100 tiles for the three regions, then monthly refreshes.
- **Orders:** the matrix is countries × cities (about 200 × 28), so it is a long tail; city-by-city order means Leiden is finished first. Every job costs Apify credit.

## Order platforms

| Where | Platform | Apify actor (env override) |
|-------|----------|----------------------------|
| NL | Thuisbezorgd.nl | `jarvismoney/thuisbezorgd-takeaway-scraper` (`APIFY_THUISBEZORGD_ACTOR`) |
| BE | Takeaway.com | same actor, `country: be`, street address |
| DE | Lieferando | `studio-amba/takeaway-scraper` (`APIFY_LIEFERANDO_ACTOR`) |
| all | Uber Eats | `borderline/uber-eats-scraper-ppr` (`APIFY_UBEREATS_ACTOR`) |

Thuisbezorgd, Takeaway.com and Lieferando are one platform family, stored as `platform: "thuisbezorgd"`; the button label follows the link's site. The browse-link fallbacks for BE/DE go to the country landing page (the diner enters their address there), because city path slugs differ per site.

## Do not

- Run `orders` and full Places restaurant discover in parallel (Apify/Places cost)
- Run content agents on the production git checkout that `deploy:prod` cleans — use a content machine or home directory with `DATABASE_URL` pointing at prod/staging
- Invent restaurants or order venues — gather/Apify only

## Related scripts

| Script | Role |
|--------|------|
| `agent:cook` | One-pass country finish (menu, photos, dinner, image) |
| `agent:complete-menus` / `agent:compose-dinners` / `agent:recipes` / `agent:cuisine-images` | The individual cook steps, still runnable alone |
| `agent:gather` | OSM tiles, promote, enrich |
| `agent:ratings` / `agent:restaurant-photos` | Bulk re-runs of the post-promote enrichment |
| Admin discover UI | Manual one-off city focus |
