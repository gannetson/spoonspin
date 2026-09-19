/**
 * TheFork B2B HTTP client (https://docs.thefork.io).
 * Only documented booking-funnel endpoints. Never invents restaurant search.
 */
import { AVAILABILITY_CACHE_TTL_MS, theForkCredentials } from "../config.ts";
import type { AvailabilitySlot } from "../types.ts";

const TOKEN_URL = "https://auth.thefork.io/oauth/token";
const API_BASE = "https://api.thefork.io/manager/v1";
/** Auth0 tokens expire after ~8600s; refresh a minute early. */
const TOKEN_TTL_MS = 8500_000;

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

type AvailabilityCache = { expiresAt: number; slots: AvailabilitySlot[] };
const availabilityCache = new Map<string, AvailabilityCache>();

export type TheForkHttpDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hhmm(value: string): string | null {
  const match = /(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function slotStartAt(date: string, timeOrIso: string): string | null {
  const trimmed = timeOrIso.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;
  const time = hhmm(trimmed);
  if (!time) return null;
  return `${date}T${time}:00`;
}

function itemAvailable(item: Record<string, unknown>): boolean {
  if (item.available === false || item.isAvailable === false) return false;
  if (item.unavailable === true) return false;
  return true;
}

function itemTime(item: Record<string, unknown>): string | null {
  for (const key of ["startAt", "start_at", "datetime", "dateTime", "time", "hour"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function itemBookingUrl(item: Record<string, unknown>): string | null {
  for (const key of ["bookingUrl", "booking_url", "url", "link"]) {
    const value = item[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  return null;
}

export function parseTheForkTimeslotPayload(
  payload: unknown,
  args: {
    restaurantId: string;
    date: string;
    partySize: number;
    bookingUrl: string | null;
  },
): AvailabilitySlot[] {
  const root = asRecord(payload) ?? {};
  const lists = [
    asArray(root.timeslots),
    asArray(root.timeSlots),
    asArray(root.data),
    asArray(root.items),
    asArray(root.availabilities),
    Array.isArray(payload) ? payload : [],
  ];

  const slots: AvailabilitySlot[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const raw of list) {
      if (typeof raw === "string") {
        const startAt = slotStartAt(args.date, raw);
        if (!startAt || seen.has(startAt)) continue;
        seen.add(startAt);
        slots.push({
          provider: "thefork",
          restaurantId: args.restaurantId,
          startAt,
          partySize: args.partySize,
          bookingUrl: args.bookingUrl,
        });
        continue;
      }
      const item = asRecord(raw);
      if (!item || !itemAvailable(item)) continue;
      const timeValue = itemTime(item);
      if (!timeValue) continue;
      const startAt = slotStartAt(args.date, timeValue);
      if (!startAt || seen.has(startAt)) continue;
      seen.add(startAt);
      slots.push({
        provider: "thefork",
        restaurantId: args.restaurantId,
        startAt,
        partySize: args.partySize,
        bookingUrl: itemBookingUrl(item) ?? args.bookingUrl,
      });
    }
    if (slots.length > 0) break;
  }

  return slots;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function getTheForkAccessToken(
  deps: TheForkHttpDeps = {},
): Promise<string | null> {
  const creds = theForkCredentials();
  if (!creds.configured || !creds.clientId || !creds.clientSecret) return null;

  const now = deps.now ?? Date.now;
  if (tokenCache && tokenCache.expiresAt > now()) return tokenCache.token;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      audience: "https://api.thefork.io",
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  if (!response.ok) return null;
  const payload = asRecord(await readJson(response));
  const token = typeof payload?.access_token === "string" ? payload.access_token : null;
  if (!token) return null;
  tokenCache = { token, expiresAt: now() + TOKEN_TTL_MS };
  return token;
}

export function clearTheForkHttpCaches(): void {
  tokenCache = null;
  availabilityCache.clear();
}

export async function fetchTheForkTimeslots(
  input: {
    externalRestaurantId: string;
    restaurantId: string;
    date: string;
    partySize: number;
    bookingUrl: string | null;
  },
  deps: TheForkHttpDeps = {},
): Promise<
  | { status: "ok"; slots: AvailabilitySlot[] }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "not_found"; message: string }
> {
  const cacheKey = `${input.externalRestaurantId}|${input.date}|${input.partySize}`;
  const now = deps.now ?? Date.now;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > now()) {
    return { status: "ok", slots: cached.slots };
  }

  const token = await getTheForkAccessToken(deps);
  if (!token) {
    return { status: "error", message: "thefork: could not obtain access token", retryable: true };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = new URL(
    `${API_BASE}/restaurants/${encodeURIComponent(input.externalRestaurantId)}/timeslots`,
  );
  url.searchParams.set("date", input.date);
  url.searchParams.set("partySize", String(input.partySize));

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    return { status: "not_found", message: "thefork: restaurant not found" };
  }
  if (response.status === 401 || response.status === 403) {
    tokenCache = null;
    return {
      status: "error",
      message: `thefork: timeslots HTTP ${response.status}`,
      retryable: true,
    };
  }
  if (!response.ok) {
    return {
      status: "error",
      message: `thefork: timeslots HTTP ${response.status}`,
      retryable: response.status >= 500,
    };
  }

  const slots = parseTheForkTimeslotPayload(await readJson(response), {
    restaurantId: input.restaurantId,
    date: input.date,
    partySize: input.partySize,
    bookingUrl: input.bookingUrl,
  });
  availabilityCache.set(cacheKey, {
    slots,
    expiresAt: now() + AVAILABILITY_CACHE_TTL_MS,
  });
  return { status: "ok", slots };
}
