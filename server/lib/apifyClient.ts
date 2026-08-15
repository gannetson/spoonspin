/** Shared Apify Actor runner (REST run-sync-get-dataset-items). */

const APIFY_API = "https://api.apify.com/v2";

export function getApifyToken(): string | null {
  return process.env.APIFY_TOKEN?.trim() || null;
}

export function isApifyConfigured(): boolean {
  return Boolean(getApifyToken());
}

export function actorIdForUrl(actor: string): string {
  return actor.includes("~") ? actor : actor.replace("/", "~");
}

export function envActor(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export async function runActorDatasetItems(input: {
  actor: string;
  body: Record<string, unknown>;
  timeoutSecs?: number;
}): Promise<unknown[]> {
  const token = getApifyToken();
  if (!token) {
    throw new Error("APIFY_TOKEN is not configured. Add it to .env to use Apify actors.");
  }

  const actorId = actorIdForUrl(input.actor);
  const timeoutSecs = input.timeoutSecs ?? 240;
  const url = new URL(
    `${APIFY_API}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`,
  );
  url.searchParams.set("token", token);
  url.searchParams.set("timeout", String(timeoutSecs));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.body),
    signal: AbortSignal.timeout((timeoutSecs + 30) * 1000),
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 240);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // keep raw
    }
    throw new Error(`Apify actor ${input.actor} failed (${response.status}): ${detail}`);
  }

  if (!text.trim()) return [];
  const parsed = JSON.parse(text) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}
