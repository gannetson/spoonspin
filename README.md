# Spoon Spin

Randomly discover a country, then choose whether to **cook** its food at home or **dine** at a restaurant in the Netherlands.

## Product overview

Spoon Spin is a mobile-friendly MVP for food-and-travel inspiration:

1. Tap **Pick a country** for a short spin animation.
2. Land on a published cuisine card (flag, region, iconic dish, typical drink).
3. Choose **Cook** for a full menu and recipes, or **Dine** to search Dutch restaurants.
4. Share a deep link such as `/?country=bg&mode=cook`.

Content lives in typed TypeScript modules (no database, CMS, auth, or payments).

## Stack

- React + TypeScript (Vite)
- Tailwind CSS
- Zod content validation
- Vitest + React Testing Library
- Playwright end-to-end tests
- Lucide React icons
- Express API for restaurant search (Google Places and/or Mapbox; secrets stay server-side)

## Local setup

Requirements: Node.js 20+ (22 recommended).

```bash
cp .env.example .env
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

### Required commands

| Command                    | Purpose                                |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | API + Vite client together             |
| `npm run build`            | Typecheck + production bundle          |
| `npm run preview`          | Preview the production client build    |
| `npm run lint`             | Lint with oxlint                       |
| `npm run format`           | Format with Prettier                   |
| `npm run typecheck`        | TypeScript project build check         |
| `npm test`                 | Unit / component tests                 |
| `npm run test:e2e`         | Playwright main journey                |
| `npm run validate:content` | Zod validation for published countries |

## Environment variables

Copy `.env.example` to `.env`:

| Variable                | Required                      | Description                                      |
| ----------------------- | ----------------------------- | ------------------------------------------------ |
| `MAPBOX_ACCESS_TOKEN`   | No (recommended free option)  | Server-only Mapbox access token                  |
| `GOOGLE_PLACES_API_KEY` | No                            | Server-only Google Places API key                |
| `RESTAURANT_PROVIDER`   | No                            | `auto` (default), `mapbox`, or `google`          |
| `API_PORT`              | No                            | Defaults to `3001`                               |

Never put provider secrets in Vite `VITE_*` variables or client code.

## Restaurant providers

Spoon Spin supports two live providers, plus a Maps fallback when none are configured.

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

With `RESTAURANT_PROVIDER=auto` (default):

1. Use Mapbox when `MAPBOX_ACCESS_TOKEN` is set
2. Else use Google when `GOOGLE_PLACES_API_KEY` is set
3. Else show the development fallback + Google Maps search link

The server:

- searches each cuisine alias (English + Dutch where useful)
- merges results and deduplicates by place ID
- caches successful searches for 24 hours in memory
- never invents restaurant names

### Cost notes

Both Google Places and Mapbox Search can incur cost after free allowances. Caching reduces repeat traffic. Restrict tokens/keys and set budget alerts.

## How to add another country

1. Copy the documented template in `src/content/countries/template.ts`.
2. Create `src/content/countries/<code>.ts` with a complete `Country` object and `status: "published"`.
3. Export it from `src/content/countries/published.ts`.
4. Set the matching catalog entry in `src/content/countries/catalog.ts` to `status: "published"`.
5. Run `npm run validate:content`.

### Content-quality guidelines

- Only publish complete records (dish, drink, full menu, recipes, cuisine aliases).
- Prefer wording such as “iconic”, “widely considered”, or “best-known” — avoid claiming contested dishes are official national dishes.
- Write original recipe instructions; do not paste website recipes.
- Mark alcoholic vs non-alcoholic drinks clearly.
- Include Dutch-friendly substitutions for hard-to-find ingredients.
- Never ship empty recipes or “coming soon” fields on published countries.

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

## Published MVP countries (20)

Netherlands, Bulgaria, Georgia, Italy, Spain, Greece, Turkey, Lebanon, Morocco, Ethiopia, Senegal, South Africa, India, Indonesia, Vietnam, Japan, Mexico, Peru, Brazil, Jamaica.

The catalog lists 197 entries (193 UN members + Palestine, Vatican City, Kosovo, Taiwan). Draft entries are never selectable.

## Limitations

- Restaurant search depends on Mapbox or Google Places when configured; otherwise Maps fallback only.
- In-memory Places cache resets when the API process restarts.
- Production hosting should run the Express API alongside the static Vite build (or put the API behind the same origin `/api` proxy).
- Catalog coverage beyond the 20 published countries is intentional scaffolding for later content work.
