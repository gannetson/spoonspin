# Content fill strategy (all countries × Randstad cities)

Goal: steadily fill **recipes / dinners / images**, **restaurants**, and **order options** for every published cuisine, focused on these Dutch hubs:

- Leiden
- Amsterdam
- Rotterdam
- Den Haag
- Utrecht

These match the `randstad` OSM hubs and the Apify delivery search hubs.

## Orchestrator

```bash
# Progress / gaps
npm run agent:fill -- --status

# Cron-friendly: one small batch of each lane
npm run agent:fill -- --lane daily --batch 2

# Individual lanes
npm run agent:fill -- --lane cook --batch 3
npm run agent:fill -- --lane restaurants --batch 4
npm run agent:fill -- --lane orders --batch 3

# One country / subset of cities
npm run agent:fill -- --lane orders --code it --cities Leiden,Amsterdam
```

Progress for order jobs: `data/fill-content-progress.json` (gitignored).

## Lanes

| Lane | What it does | Env |
|------|----------------|-----|
| **cook** | `agent:dishes` → `complete-menus` → `compose-dinners` → `recipes` → `cuisine-images` | `OPENAI_API_KEY`, `DATABASE_URL` |
| **restaurants** | `agent:gather --hubs randstad` for all published countries | `DATABASE_URL` (OSM; free but rate-limited) |
| **orders** | Apify Thuisbezorgd + Uber Eats per **country × city**, then save options | `APIFY_TOKEN`, optional `OPENAI_API_KEY` for notes |
| **daily** | cook + restaurants + orders, small `--batch` | all of the above |

Order jobs skip a city when that country already has options whose `city` matches. Use `--reset-orders` to rebuild the completed-job list (does not delete saved options).

## Recommended schedule

Stagger expensive Apify/Places work. Example crontab (user with DB access, not `www-data` deploy checkout if agents rewrite local `data/`):

```cron
# Cook menus — morning (OpenAI)
15 6 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane cook --batch 2 >>/var/log/spoonspin-fill-cook.log 2>&1

# Restaurants — midday (OSM Randstad)
15 12 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane restaurants --batch 4 >>/var/log/spoonspin-fill-restaurants.log 2>&1

# Order options — evening (Apify; 3 country×city jobs)
30 20 * * * cd /path/to/spoonspin && npm run agent:fill -- --lane orders --batch 3 >>/var/log/spoonspin-fill-orders.log 2>&1
```

Or install the sample files under [`deploy/cron/`](../deploy/cron/) and [`deploy/systemd/`](../deploy/systemd/).

Rough throughput:

- **Cook:** a few countries/day toward cook-ready menus
- **Restaurants:** 4 hub×cuisine OSM jobs/run across the 5 cities
- **Orders:** ~3 Apify city jobs/run → full matrix (countries × 5 cities) over days/weeks

## Priority per country

1. Dishes → complete cook menu + drink → cuisine/recipe images  
2. OSM restaurants in Randstad → promote → (later) ratings/photos  
3. Order options: Leiden first (default Order UI city), then Amsterdam, Rotterdam, Den Haag, Utrecht  
4. Compose dinner once courses exist  

## Do not

- Run `orders` and full Places restaurant discover in parallel (Apify/Places cost)  
- Run content agents on the production git checkout that `deploy:prod` cleans — use a content machine or home directory with `DATABASE_URL` pointing at prod/staging  
- Invent restaurants or order venues — gather/Apify only  

## Related scripts

| Script | Role |
|--------|------|
| `agent:complete-menus` | Cook-ready menus |
| `agent:gather` | OSM restaurants (now loads published countries from DB) |
| `agent:ratings` / `agent:restaurant-photos` | Post-promote enrich |
| Admin discover UI | Manual one-off city focus |
