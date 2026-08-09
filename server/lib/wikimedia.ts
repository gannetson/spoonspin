const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; cuisine image lookup)";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

type CommonsSearch = {
  query?: {
    search?: Array<{ title: string }>;
    searchinfo?: { totalhits?: number };
  };
  continue?: { sroffset?: number };
};

type CommonsImageInfo = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          mime?: string;
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
          };
        }>;
      }
    >;
  };
};

export type ImageLookupOptions = {
  /** Skip these URLs (e.g. the image currently shown). */
  excludeUrls?: Array<string | null | undefined>;
};

function isPhotoUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (!IMAGE_EXT.test(url)) return false;
  if (/\.(pdf|webm|svg|tif|tiff)(\?|$)/i.test(url)) return false;
  return true;
}

/** Compare image URLs ignoring signed query strings (Google media tokens, etc.). */
export function sameImageUrl(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return (
      left.hostname === right.hostname && left.pathname === right.pathname
    );
  } catch {
    return a === b;
  }
}

function isExcluded(
  url: string,
  excludeUrls: Array<string | null | undefined> | undefined,
): boolean {
  if (!excludeUrls?.length) return false;
  return excludeUrls.some(
    (excluded) =>
      typeof excluded === "string" &&
      excluded.trim() &&
      sameImageUrl(url, excluded.trim()),
  );
}

/** Fisher–Yates shuffle (copy). */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      "Api-User-Agent": USER_AGENT,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return (await response.json()) as T;
}

async function resolveCommonsTitle(
  title: string,
): Promise<{ url: string; attribution: string } | null> {
  if (/\.(pdf|webm|svg|tif|tiff)$/i.test(title)) return null;

  const infoUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      format: "json",
      origin: "*",
    });
  const info = await fetchJson<CommonsImageInfo>(infoUrl);
  const page = Object.values(info?.query?.pages ?? {})[0];
  const image = page?.imageinfo?.[0];
  if (!image?.url) return null;
  if (image.mime && !IMAGE_MIME.test(image.mime)) return null;
  if (!isPhotoUrl(image.url)) return null;

  const license =
    image.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
  const artist = image.extmetadata?.Artist?.value
    ?.replace(/<[^>]+>/g, "")
    .trim();
  const attribution = artist
    ? `${artist} / ${license}`
    : `Wikimedia Commons / ${license}`;

  return { url: image.url, attribution };
}

/** Search Commons and return several photo candidates (order randomised). */
export async function findCommonsImageCandidates(
  query: string,
  options?: ImageLookupOptions & { limit?: number },
): Promise<Array<{ url: string; attribution: string }>> {
  const limit = options?.limit ?? 10;
  const searchUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6",
      srlimit: String(Math.min(20, Math.max(limit, 8))),
      format: "json",
      origin: "*",
    });
  const search = await fetchJson<CommonsSearch>(searchUrl);
  const hits = shuffleInPlace([...(search?.query?.search ?? [])]);
  const out: Array<{ url: string; attribution: string }> = [];

  for (const hit of hits) {
    if (!hit?.title) continue;
    const resolved = await resolveCommonsTitle(hit.title);
    if (!resolved) continue;
    if (isExcluded(resolved.url, options?.excludeUrls)) continue;
    out.push(resolved);
    if (out.length >= limit) break;
  }

  return out;
}

/** Paginated Commons search (stable order for admin picker). */
export async function searchCommonsImagesPage(
  query: string,
  options?: ImageLookupOptions & { offset?: number; limit?: number },
): Promise<{
  results: Array<{ url: string; attribution: string; title: string }>;
  nextOffset: number | null;
  totalHits: number | null;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], nextOffset: null, totalHits: 0 };
  }
  const limit = Math.min(24, Math.max(1, options?.limit ?? 12));
  const offset = Math.max(0, options?.offset ?? 0);
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: trimmed,
    srnamespace: "6",
    srlimit: String(limit),
    sroffset: String(offset),
    format: "json",
    origin: "*",
  });
  const search = await fetchJson<CommonsSearch>(
    `https://commons.wikimedia.org/w/api.php?${params}`,
  );
  const hits = search?.query?.search ?? [];
  const results: Array<{ url: string; attribution: string; title: string }> =
    [];

  for (const hit of hits) {
    if (!hit?.title) continue;
    const resolved = await resolveCommonsTitle(hit.title);
    if (!resolved) continue;
    if (isExcluded(resolved.url, options?.excludeUrls)) continue;
    results.push({ ...resolved, title: hit.title });
  }

  const nextOffset =
    typeof search?.continue?.sroffset === "number"
      ? search.continue.sroffset
      : null;
  const totalHits =
    typeof search?.query?.searchinfo?.totalhits === "number"
      ? search.query.searchinfo.totalhits
      : null;

  return { results, nextOffset, totalHits };
}

export async function findCommonsImage(
  query: string,
  options?: ImageLookupOptions,
): Promise<{ url: string; attribution: string } | null> {
  const candidates = await findCommonsImageCandidates(query, {
    ...options,
    limit: 8,
  });
  return pickRandom(candidates) ?? null;
}

export async function findCuisineImageFromQueries(
  queries: string[],
  options?: ImageLookupOptions,
): Promise<{ url: string; attribution: string; query: string } | null> {
  const shuffledQueries = shuffleInPlace(
    queries.map((q) => q.trim()).filter(Boolean),
  );
  const pool: Array<{ url: string; attribution: string; query: string }> = [];

  for (const query of shuffledQueries) {
    const found = await findCommonsImageCandidates(query, {
      excludeUrls: options?.excludeUrls,
      limit: 6,
    });
    for (const image of found) {
      if (pool.some((item) => sameImageUrl(item.url, image.url))) continue;
      pool.push({ ...image, query });
    }
    // Enough variety to randomise without hitting Commons too hard.
    if (pool.length >= 8) break;
  }

  return pickRandom(pool) ?? null;
}
