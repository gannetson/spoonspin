import type { CookieConsent } from "./types";

export const CONSENT_STORAGE_KEY = "spoonspin:cookie-consent";

type Listener = () => void;

const listeners = new Set<Listener>();

/** Cached snapshot so useSyncExternalStore gets a stable Object.is identity. */
let cachedConsent: CookieConsent | null | undefined;

function isConsent(value: unknown): value is CookieConsent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.necessary === true &&
    typeof v.marketing === "boolean" &&
    typeof v.updatedAt === "string"
  );
}

function readConsentFromStorage(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Must return the same reference until consent actually changes. */
export function getConsent(): CookieConsent | null {
  if (cachedConsent === undefined) {
    cachedConsent = readConsentFromStorage();
  }
  return cachedConsent;
}

export function setConsent(consent: CookieConsent): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  cachedConsent = consent;
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function acceptMarketingConsent(): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    marketing: true,
    updatedAt: new Date().toISOString(),
  };
  setConsent(consent);
  return consent;
}

export function rejectMarketingConsent(): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    marketing: false,
    updatedAt: new Date().toISOString(),
  };
  setConsent(consent);
  return consent;
}
