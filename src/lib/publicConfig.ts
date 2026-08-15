/** Runtime public config from the API (survives restart without a Vite rebuild). */

export type PublicConfig = {
  awinPublisherId: string | null;
  awinThuisbezorgdMid: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let cached: PublicConfig | null = null;
let loadPromise: Promise<PublicConfig> | null = null;

const EMPTY: PublicConfig = {
  awinPublisherId: null,
  awinThuisbezorgdMid: null,
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
      const next: PublicConfig = {
        awinPublisherId:
          typeof row.awinPublisherId === "string" && row.awinPublisherId.trim()
            ? row.awinPublisherId.trim()
            : null,
        awinThuisbezorgdMid:
          typeof row.awinThuisbezorgdMid === "string" && row.awinThuisbezorgdMid.trim()
            ? row.awinThuisbezorgdMid.trim()
            : null,
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
