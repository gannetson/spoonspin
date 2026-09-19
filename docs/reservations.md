# Reservation integrations (NL-first)

SpoonSpin treats **Google Places** as the canonical restaurant identity layer.
**Zenchef**, **Guestplan**, and **TheFork** are reservation providers attached to
restaurants — never primary identity.

```text
                Google Places
                     |
              SpoonSpin Restaurant
                     |
             ReservationService
                     |
      +--------------+--------------+
      |              |              |
   Zenchef        Guestplan       TheFork
      |              |              |
      +--------------+--------------+
                     |
             best booking route
                     |
        website / Google Maps fallback
```

A restaurant must **not** disappear from Dine/spin merely because it has no
reservation provider. Provider failures must never break spin.

## Architecture (adapted to this repo)

| Piece | Location |
|-------|----------|
| Places identity + refresh | `server/lib/googlePlacesService.ts` (+ existing `googlePlacesLookup.ts`) |
| Feature flags / credentials | `server/reservations/config.ts` |
| Shared types | `server/reservations/types.ts` |
| Provider association tables | `server/db/reservations.ts` (migrated from `restaurants.ts`) |
| Live POI search (unchanged) | `server/providers/googlePlaces.ts`, `mapbox.ts` |

This is **not** Django — schema lives in idempotent `migrate()` DDL (Postgres).

### Google Places role

- Durable external ID: `restaurants.google_place_id` (unique when set)
- OSM harvest remains a discovery source (`osm_id`); rows are reconciled to Places
- Place Details (New) for `getRestaurantByPlaceId` / `refreshRestaurantByPlaceId`
- Place IDs may be stored indefinitely; other Places **content** is refreshed on a soft TTL (`places_refreshed_at`, ~30 days)
- Official website is filtered to drop directories/delivery hosts (existing `officialWebsiteOrUndefined`)

### Provider-neutral associations

Do **not** add `thefork_url` / `zenchef_url` columns on `restaurants`.

Use:

- `reservation_providers` — catalog + intended capability flags
- `restaurant_reservation_providers` — per-restaurant link (`external_restaurant_id`, `booking_url`, match status, metadata JSON for provider-only extras)
- `reservation_referrals` — outbound click / conversion tracking (opaque IDs; minimal PII)

## Environment variables

```bash
# Master switch (default off)
RESERVATIONS_ENABLED=false

# Per-provider switches
ZENCHEF_ENABLED=false
GUESTPLAN_ENABLED=false
THEFORK_ENABLED=false

# Google Places (already used for dine enrichment / live fallback)
GOOGLE_PLACES_API_KEY=

# Zenchef — set once partner access is granted (names may be refined)
ZENCHEF_API_KEY=
ZENCHEF_PARTNER_ID=

# Guestplan — set once partner API access exists
GUESTPLAN_API_KEY=

# TheFork B2B — Auth0 client credentials (docs.thefork.io)
THEFORK_CLIENT_ID=
THEFORK_CLIENT_SECRET=
# Optional affiliate / source id — never hard-code
THEFORK_AFFILIATE_ID=
```

Google Places remains usable when reservation flags are off.

## Fallback hierarchy

1. Live integrated reservation (`RESERVE`)
2. Provider booking deep link (`BOOK_EXTERNALLY`)
3. Verified restaurant reservation URL on a provider link
4. Official restaurant website (`VISIT_WEBSITE`)
5. Google Maps URI (`VIEW_ON_MAP`)

Never invent URLs. Never scrape search results.

## Matching

Background reconciliation should combine name + address/postcode + coords + phone + website domain.
Name alone must not auto-link. Prefer provider IDs once `match_status = verified`.

Helpers: `scoreVenueMatch` / `isHighConfidenceVenueMatch` in `googlePlacesService.ts`.

## Partner access still required

Official research (2026) — adapters ship as `not_configured` until these are obtained.

### Zenchef

Public capability list (availability, create reservation, webhooks, restaurant metadata) is documented, but **API docs and credentials are not public**.

- [ ] Register partnership via https://www.zenchef.com/integrations (discovery partner path)
- [ ] Or restaurant-led docs request to help@zenchef.com / api-tech-help@zenchef.com
- [ ] Production (or pre-prod demo) API credentials
- [ ] Confirmed auth scheme + base URL for partner discovery use case
- [ ] Source attribution / reservation tag for SpoonSpin (as with breeze, dinestar, etc.)
- [ ] Restaurant Grow subscription or special agreement where required per venue

Swagger UI exists at `https://zenchefapi.resengo.com/index.html` but partner auth is not publicly documented — do not invent endpoints.

### Guestplan

Marketplace integrations (BookDinners, Dinestar, Reserve with Google, …). **No public reservation/discovery API docs.** Pricing mentions an “Export API” on Enterprise — not a booking partner API.

- [ ] Partnership / integration inquiry via https://www.guestplan.com/integrations/
- [ ] API documentation and auth model for discovery + availability
- [ ] Production credentials
- [ ] Source attribution if supported

### TheFork

Documented **B2B / Partners API** at https://docs.thefork.io — **access requires approval**.

- [ ] Contact integrations@thefork.com with company + use case
- [ ] Auth0 `client_id` / `client_secret` for `https://auth.thefork.io/oauth/token`
- [ ] Contract / rate limits for booking-funnel use
- [ ] Affiliate or revenue-share agreement if monetizing outbound bookings
- [ ] SpoonSpin affiliate / source ID (env only — never hard-code)
- [ ] Confirm NL coverage and restaurant matching endpoints available to our partner tier

Affiliate networks (e.g. Awin country programmes) are separate from the B2B API and must be configured independently if used.

## How to add another reservation provider

1. Add key to `ReservationProviderKey` and capability catalog in `server/reservations/`
2. Seed row in `migrateReservationTables`
3. Implement adapter returning explicit `not_configured` / `unsupported` / `ok`
4. Wire into `ReservationService` selection (Phase 2+)
5. Document env vars + partner checklist here
6. Add unit tests with mocked HTTP — never hit live partner APIs in CI

## Testing

- Unit: matching, price-level map, feature flags, adapter states (mocked fetch)
- DB: `google_place_id` uniqueness, reservation link upsert (`server/db/reservations.test.ts`)
- CI must not depend on live Google / Zenchef / Guestplan / TheFork

## Status

| Phase | Status |
|-------|--------|
| 1 Places identity + provider-neutral models | Done |
| 2 ReservationService + adapters + fallbacks | Done (`not_configured` until partner creds) |
| 3 Live provider HTTP | Blocked on partner credentials |
| 4 API + RestaurantView booking CTA | Done |
| 5 Referral click tracking | Done (schema + `POST …/reservation-clicks`); webhooks later |
| 6 Tests + docs | Done for current surface |

## SpoonSpin API

```http
GET  /api/restaurants/:id/reservation-options?date=YYYY-MM-DD&time=HH:MM&party_size=4
POST /api/restaurants/:id/reservation-clicks
GET  /api/admin/restaurants/:id/reservations
POST /api/admin/restaurants/:id/reconcile-places
```

`/api/public-config` includes `reservationsEnabled` and per-provider enabled flags (no secrets).

## Ops

```bash
npm run agent:reconcile-places -- --limit=20
npm run agent:reconcile-places -- --force
```
