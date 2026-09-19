/** Runtime public config from the API (survives restart without a Vite rebuild). */

export type PublicConfig = {
  awinPublisherId: string | null;
  awinThuisbezorgdMid: string | null;
  reservationsEnabled: boolean;
  reservationProviders: {
    zenchef: boolean;
    guestplan: boolean;
    thefork: boolean;
  };
};

type Listener = () => void;

const listeners = new Set<Listener>();

let cached: PublicConfig | null = null;
let loadPromise: Promise<PublicConfig> | null = null;

const EMPTY: PublicConfig = {
  awinPublisherId: null,
  awinThuisbezorgdMid: null,
  reservationsEnabled: false,
  reservationProviders: {
    zenchef: false,
    guestplan: false,
    thefork: false,
  },
};

export function getPublicConfig(): PublicConfig {
  return cached ?? EMPTY;
}

export function subscribePublicConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setCached(next: PublicConfig): void {
  cached = next;
  for (const listener of listeners) listener();
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export async function loadPublicConfig(): Promise<PublicConfig> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch("/api/public-config", { credentials: "same-origin" });
      if (!res.ok) {
        setCached(EMPTY);
        return EMPTY;
      }
      const data: unknown = await res.json();
      const row =
        data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      const providers =
        row.reservationProviders && typeof row.reservationProviders === "object"
          ? (row.reservationProviders as Record<string, unknown>)
          : {};
      const next: PublicConfig = {
        awinPublisherId:
          typeof row.awinPublisherId === "string" && row.awinPublisherId.trim()
            ? row.awinPublisherId.trim()
            : null,
        awinThuisbezorgdMid:
          typeof row.awinThuisbezorgdMid === "string" && row.awinThuisbezorgdMid.trim()
            ? row.awinThuisbezorgdMid.trim()
            : null,
        reservationsEnabled: asBool(row.reservationsEnabled),
        reservationProviders: {
          zenchef: asBool(providers.zenchef),
          guestplan: asBool(providers.guestplan),
          thefork: asBool(providers.thefork),
        },
      };
      setCached(next);
      return next;
    } catch {
      setCached(EMPTY);
      return EMPTY;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}
