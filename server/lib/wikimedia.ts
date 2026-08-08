const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; cuisine image lookup)";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;

type CommonsSearch = {
  query?: { search?: Array<{ title: string }> };
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

function isPhotoUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (!IMAGE_EXT.test(url)) return false;
  if (/\.(pdf|webm|svg|tif|tiff)(\?|$)/i.test(url)) return false;
  return true;
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

export async function findCommonsImage(
  query: string,
): Promise<{ url: string; attribution: string } | null> {
  const searchUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6",
      srlimit: "8",
      format: "json",
      origin: "*",
    });
  const search = await fetchJson<CommonsSearch>(searchUrl);
  const hits = search?.query?.search ?? [];

  for (const hit of hits) {
    if (!hit?.title) continue;
    if (/\.(pdf|webm|svg|tif|tiff)$/i.test(hit.title)) continue;

    const infoUrl =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        titles: hit.title,
        prop: "imageinfo",
        iiprop: "url|mime|extmetadata",
        format: "json",
        origin: "*",
      });
    const info = await fetchJson<CommonsImageInfo>(infoUrl);
    const page = Object.values(info?.query?.pages ?? {})[0];
    const image = page?.imageinfo?.[0];
    if (!image?.url) continue;
    if (image.mime && !IMAGE_MIME.test(image.mime)) continue;
    if (!isPhotoUrl(image.url)) continue;

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

  return null;
}

export async function findCuisineImageFromQueries(
  queries: string[],
): Promise<{ url: string; attribution: string; query: string } | null> {
  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed) continue;
    const image = await findCommonsImage(trimmed);
    if (image) {
      return { ...image, query: trimmed };
    }
  }
  return null;
}
