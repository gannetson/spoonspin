# Spoon Spin

Randomly discover a country, then choose whether to **cook** its food at home or **dine** at a restaurant in the Netherlands.

## Product overview

Spoon Spin is a mobile-friendly MVP for food-and-travel inspiration:

1. Tap **Spin the spoon** for a short spin animation, or choose a country from the list.
2. Land on a published cuisine card (flag, region, iconic dish, typical drink).
3. Choose **Cook** for a full menu and recipes, or **Dine** to search Dutch restaurants.
4. Share a deep link such as `/?country=bg&mode=cook`.

Content lives in **Postgres** (countries, recipes, drinks, shops, restaurants). The git repo holds UI/API code and a thin country catalog (codes/names/flags). Edit content via the admin UI or DB agents — not by committing JSON/TS menus.

## Stack

- React + TypeScript (Vite)
- Tailwind CSS
- Zod content validation
- Vitest + React Testing Library
- Playwright end-to-end tests
- Lucide React icons
- Express API for restaurant search (Google Places and/or Mapbox; secrets stay server-side)

## Production (spoonspin.nl)

Nginx serves `dist/` and proxies `/api` to Express (`:3007`) under supervisord.

See **[deploy/README.md](deploy/README.md)** for nginx + supervisor configs and `deploy/install-server.sh`. App path on the server: `/var/www/spoonspin/spoonspin`.

From your laptop: `npm run deploy:prod` (SSH → discard dirty `src/content/` → git pull → build → restart) — [`deploy/remote-deploy.sh`](deploy/remote-deploy.sh).

## Local setup

Requirements: Node.js 20+ (22 recommended).

```bash
cp .env.example .env
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3007

### Required commands

| Command                    | Purpose                                |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | API + Vite client together             |
| `npm run build`            | Typecheck + production bundle          |
| `npm start`                | Production API (`tsx server/index.ts`) |
| `npm run preview`          | Preview the production client build    |
| `npm run lint`             | Lint with oxlint                       |
| `npm run format`           | Format with Prettier                   |
| `npm run typecheck`        | TypeScript project build check         |
| `npm test`                 | Unit / component tests                 |
| `npm run test:e2e`         | Playwright main journey                |
| `npm run validate:content` | Zod validation for thin catalog stubs |
| `npm run content:wikipedia` | Refresh Wikipedia cuisine summaries → `data/` (optional research) |
| `npm run agent:recipes` | Enrich recipe photos/links in Postgres |
| `npm run agent:restaurant-photos` | Enrich restaurants with photos (Postgres) |
| `npm run agent:restaurants`| One-shot OSM harvest for chosen hubs/cuisines |
| `npm run agent:gather`     | Incremental gather over time (resumable batches) |
| `npm run agent:curate`     | Import `data/curated-restaurants.json` → Postgres |
| `npm run agent:ratings`    | Enrich guest ratings in Postgres (Google / Tripadvisor) |
| `npm run db:export-content` | Export countries/recipes/restaurants → `data/content-dump.json` |
| `npm run db:import-content` | Import content dump into Postgres |
| `npm run db:seed-content`  | Alias for `db:import-content` |
| `npm run deploy:prod`      | SSH → pull → build → restart API |

## Environment variables

Copy `.env.example` to `.env`:

| Variable                | Required                     | Description                             |
| ----------------------- | ---------------------------- | --------------------------------------- |
| `MAPBOX_ACCESS_TOKEN`   | No (live fallback)           | Server-only Mapbox access token         |
| `GOOGLE_PLACES_API_KEY` | No (ratings + live fallback) | Google Places key for rating enrichment |
| `TRIPADVISOR_API_KEY`   | No                           | Tripadvisor Content API key (optional)  |
| `OPENAI_API_KEY`        | No (suggestions)             | Confirms community recipe/restaurant suggestions |
| `OPENAI_MODEL`          | No                           | Defaults to `gpt-4o-mini`               |
| `APIFY_TOKEN`           | No (order options / TA)      | Admin discover: delivery actors + Tripadvisor restaurants (English) |
| `RESTAURANT_PROVIDER`   | No                           | `auto` (default), `mapbox`, or `google` |
| `RESTAURANT_LIVE_FALLBACK` | No                        | Set `1` to allow Mapbox/Google when curated DB has no match (off by default) |
| `DATABASE_URL`          | No                           | Defaults to `postgresql://localhost:5432/spoonspin` |
| `API_PORT`              | No                           | Defaults to `3007`                      |

Never put provider secrets in Vite `VITE_*` variables or client code.

## Auth

Register or sign in at `/login` with email and password (min 8 characters). Sessions use an httpOnly cookie (`spoonspin_session`). The API exposes `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`. New accounts get role `member`. Promote an admin with:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Countries & recipes in Postgres

Countries, recipes, drinks, shops, and restaurants are stored in Postgres. The app loads them from `GET /api/countries` (no bundled menu fallback).

Bootstrap a new environment from a dump (export from a fully seeded DB first):

```bash
npm run db:export-content   # writes data/content-dump.json (gitignored)
npm run db:import-content   # upserts countries + recipes + restaurants
```

Ongoing edits: use the admin UI or agents against `DATABASE_URL`. Do **not** run file-writing research agents on the production checkout — deploy discards local `src/content/` changes before `git pull`.

## Community suggestions

On Cook and Dine, **Suggest a recipe/restaurant** opens a modal. Enter a name or short description, then **Look up & confirm** (OpenAI). Confirmed items are added immediately and queued for review.

- Public app: pending + approved stay visible; rejected items are hidden
- Admin: sign in as a user with role `admin`, then open [http://localhost:5173/admin](http://localhost:5173/admin) to approve or reject

## Local restaurant database (primary)

Dine searches a local PostgreSQL database first (default database `spoonspin`). By default it returns **reviewed** restaurants only, sorted by **authenticity rating** (5→1), then distance from Leiden/your city. Live Mapbox/Google providers are used only when there are no reviewed matches for that cuisine.

### Authenticity scale

| Rating | Meaning |
| ------ | ------- |
| 5 | Highly authentic specialty kitchen |
| 4 | Strong specialty focus |
| 3 | Solid specialty with some adaptation |
| 2 | Partial / thin specialty signal |
| 1 | Weak |

### Quality curation agent

Optional one-way import from `data/curated-restaurants.json` (gitignored):

```bash
npm run agent:curate
```

The agent upserts each entry as `reviewed` with an authenticity rating and notes. Add real restaurants only — never invent names. Prefer admin discover / add for day-to-day updates.

### Proef de Wereld research guide

Edition 0.9 (Afghanistan–Mauritius) can be bulk-imported into `data/curated-restaurants.json` then Postgres:

```bash
npm run agent:proef -- ~/Downloads/Proef_de_Wereld_onderzoekeditie_0.9.docx
npm run agent:curate
```

The importer keeps Netherlands venues with known cuisine tags (evidence A–C), skips shops, abroad/travel fallbacks, and duplicates, and maps authenticity scores from /10 to the 1–5 scale.

### Incremental gather agent (more restaurants over time)

```bash
# Status / remaining jobs
npm run agent:gather -- --status

# Process next small batch (default 4 hub×cuisine jobs), then promote specialty matches
npm run agent:gather

# Larger batch
npm run agent:gather -- --batch 8 --hubs nl-major --radius-km 25

# Promote from already-harvested OSM rows only (no network)
npm run agent:gather -- --promote-only

# Reset job progress (does not delete restaurants)
npm run agent:gather -- --reset
```

Progress lives in `data/gather-progress.json` (gitignored). Re-run whenever you like, or on a schedule (`/loop 30m npm run agent:gather` in Cursor). Sparse cuisines are harvested first. Promoted places get authenticity 3–4 and `reviewSource: gather-agent` until you tighten them in admin.

### Guest ratings (Google / The Fork / Tripadvisor)

```bash
npm run agent:ratings
```

- **Google** — fetched automatically when `GOOGLE_PLACES_API_KEY` is set
- **Tripadvisor** — fetched when `TRIPADVISOR_API_KEY` is set (Content API access required)
- **The Fork** — no free public API; set `ratings.theFork` via admin / DB (`score` on a `/10` scale with `"scale": 10`)

Scores are stored per source on the restaurant row, shown in Dine, and combined into one guest rating for sorting.

### Fill / refresh the OSM harvest (optional)

```bash
# Randstad hubs (default): Leiden, Amsterdam, Rotterdam, The Hague, Utrecht
npm run agent:restaurants

# Leiden only
npm run agent:restaurants -- --hubs leiden

# Broader NL major cities
npm run agent:restaurants -- --hubs nl-major --radius-km 25

# Specific cuisines
npm run agent:restaurants -- --hubs randstad --countries fr,de,th,kr,cn,pt,ar,ng,eg,ph
```

The harvest agent queries the free Overpass/OpenStreetMap API for specialty cuisine tags around each hub, then upserts results. Harvested rows stay **unreviewed** until you promote them via admin or `agent:curate`.

Hub presets: `leiden`, `randstad` (default), `nl-major`.

Re-run periodically to pick up new OSM tags. Be polite to Overpass (the script waits between requests and retries on rate limits).

## Live restaurant providers (fallback)

Spoon Spin can also call Mapbox or Google Places when the local DB is empty for a cuisine.

### Mapbox (free tier friendly)

1. Create a free Mapbox account and an access token.
2. Enable/use the **Search Box API** (forward search).
3. Set `MAPBOX_ACCESS_TOKEN` in `.env`.
4. Optionally set `RESTAURANT_PROVIDER=mapbox`.
5. Restart `npm run dev`.

Mapbox includes a recurring free monthly allowance for Search Box usage. Keep an eye on usage in the Mapbox dashboard; requests beyond the free tier are billable.

### Google Places

1. Create a Google Cloud project and enable **Places API (New)**.
2. Create an API key restricted to Places Text Search (`places:searchText`).
3. Set `GOOGLE_PLACES_API_KEY` in `.env`.
4. Optionally set `RESTAURANT_PROVIDER=google`.
5. Restart `npm run dev`.

### Provider selection

Search order:

1. Local Postgres matches for the selected country code
2. With `RESTAURANT_PROVIDER=auto`: Mapbox if token set, else Google if key set
3. Otherwise show a friendly fallback + Google Maps search link

Live provider responses are cached in memory for 24 hours.

### Cost notes

Overpass/OSM harvesting is free. Mapbox and Google Places can incur cost after free allowances. Restrict tokens/keys and set budget alerts.

## How to add cook-ready recipes for a country

All catalog countries are spinable once present in Postgres. To add or expand a Cook menu:

1. Sign in as admin and use **Discover / add recipe** (and drinks/shops) on the country page, or
2. Import a content dump that already includes that country (`npm run db:import-content`).

Optional research helpers write under gitignored `data/` (and update Postgres where applicable):

```bash
npm run content:wikipedia   # → data/wikipedia-cuisines.json
npm run agent:dishes        # → data/dishes-by-country.json
npm run agent:recipes       # enriches recipe rows in Postgres
npm run agent:cuisine-images
```

### Content-quality guidelines

- Only mark cook-ready when dish, drink, full menu, recipes, and cuisine aliases are complete.
- Prefer wording such as “iconic”, “widely considered”, or “best-known” — avoid claiming contested dishes are official national dishes.
- Write original recipe instructions; do not paste website recipes.
- Mark alcoholic vs non-alcoholic drinks clearly.
- Include Dutch-friendly substitutions for hard-to-find ingredients.
- Never ship empty recipes on cook-ready countries.

## Testing and production build

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium   # first time only
npm run test:e2e
```

## Country coverage

**Spinable worldwide:** 197 catalog entries (193 UN members + Palestine, Vatican City, Kosovo, Taiwan).

**Cook-ready menus (32):** Netherlands, Bulgaria, Georgia, Italy, Spain, Greece, Turkey, Lebanon, Morocco, Ethiopia, Senegal, South Africa, India, Indonesia, Vietnam, Japan, Mexico, Peru, Brazil, Jamaica, France, Germany, Thailand, South Korea, China, Portugal, Argentina, Nigeria, Egypt, Philippines, United Kingdom, Poland.

Other countries show a Wikipedia cuisine overview (when found) and support Dine; Cook shows “recipes coming soon” until a full menu is authored.

## Limitations

- Dine prefers **reviewed** local restaurants with authenticity ratings (`npm run agent:curate`). Unreviewed OSM harvest rows are ignored until curated.
- Sparse cuisines (e.g. Bulgaria, Senegal, Egypt, Philippines) may still fall back to Mapbox/Google when no reviewed entry exists.
- Restaurant data lives in Postgres (`DATABASE_URL`, default database `spoonspin`) and is not committed; run `npm run agent:curate` (and optionally `npm run agent:restaurants`) on each machine.
- In-memory live-provider cache resets when the API process restarts.
- Production: nginx + supervisord configs live under [`deploy/`](deploy/); see [`deploy/README.md`](deploy/README.md).
- A few small countries lack a dedicated Wikipedia cuisine article; those still spin with a short fallback blurb.
