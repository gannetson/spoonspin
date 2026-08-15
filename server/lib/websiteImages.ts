/**
 * Extract candidate photos from a restaurant's official website
 * (Open Graph / Twitter cards + a few large <img> tags).
 */

import { sameImageUrl } from "./wikimedia.ts";

const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; restaurant website image lookup)";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_RESULTS = 8;

const SKIP_URL_RE =
  /(?:favicon|sprite|logo[-_.]?small|icon[-_.]|pixel|tracker|1x1|badge|button|avatar|emoji|wp-includes|gravatar|\.svg(?:\?|$))/i;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(?:\?|$)/i;

export type WebsiteImageCandidate = {
  url: string;
  attribution: string;
  title: string;
};

function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function absolutize(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function looksLikePhotoUrl(url: string): boolean {
  if (SKIP_URL_RE.test(url)) return false;
  if (url.startsWith("data:")) return false;
  // Prefer explicit image extensions; also allow common CDN paths without ext.
  if (IMAGE_EXT_RE.test(url)) return true;
  if (/\/(?:image|images|img|media|uploads|photos|wp-content\/uploads)\//i.test(url)) {
    return !/\.(svg|pdf|mp4|webm)(?:\?|$)/i.test(url);
  }
  return false;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metaContent(html: string, propertyOrName: string): string | undefined {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return undefined;
}

function collectImgSrcs(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch =
      tag.match(/\b(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i) ??
      tag.match(/\bsrcset=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) continue;
    let candidate = srcMatch[1].trim();
    // srcset: take the last (usually largest) URL token
    if (tag.toLowerCase().includes("srcset=") && candidate.includes(",")) {
      const last = candidate.split(",").at(-1)?.trim().split(/\s+/)[0];
      if (last) candidate = last;
    } else if (candidate.includes(" ") && candidate.includes(",")) {
      const last = candidate.split(",").at(-1)?.trim().split(/\s+/)[0];
      if (last) candidate = last;
    }
    const absolute = absolutize(candidate, base);
    if (absolute) out.push(absolute);
  }
  return out;
}

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "website";
  }
}

/**
 * Fetch a restaurant website and return photo candidates for admin selection.
 * Failures return []; never throws to the caller.
 */
export async function fetchWebsiteImageCandidates(
  website: string | null | undefined,
  options?: {
    excludeUrls?: Array<string | null | undefined>;
    restaurantName?: string;
  },
): Promise<WebsiteImageCandidate[]> {
  const pageUrl = normalizeWebsiteUrl(website ?? "");
  if (!pageUrl) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(pageUrl, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return [];

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_HTML_BYTES) return [];
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const finalUrl = response.url || pageUrl;
    const host = hostnameLabel(finalUrl);
    const name = options?.restaurantName?.trim() || host;

    const ranked: string[] = [];
    const push = (raw: string | undefined) => {
      if (!raw?.trim()) return;
      const absolute = absolutize(raw.trim(), finalUrl);
      if (!absolute || !looksLikePhotoUrl(absolute)) return;
      if (
        options?.excludeUrls?.some(
          (excluded) =>
            typeof excluded === "string" &&
            excluded.trim() &&
            sameImageUrl(absolute, excluded.trim()),
        )
      ) {
        return;
      }
      if (ranked.some((existing) => sameImageUrl(existing, absolute))) return;
      ranked.push(absolute);
    };

    push(metaContent(html, "og:image"));
    push(metaContent(html, "og:image:secure_url"));
    push(metaContent(html, "twitter:image"));
    push(metaContent(html, "twitter:image:src"));

    for (const src of collectImgSrcs(html, finalUrl)) {
      push(src);
      if (ranked.length >= MAX_RESULTS) break;
    }

    return ranked.slice(0, MAX_RESULTS).map((url, index) => ({
      url,
      attribution: `From ${host}`,
      title: index === 0 ? `${name} (website)` : `${name} (website ${index + 1})`,
    }));
  } catch (error) {
    console.warn(`Website image lookup failed for ${pageUrl}`, error);
    return [];
  }
}

/** Best single photo from a restaurant website (for auto replace/enrich). */
export async function fetchBestWebsiteRestaurantPhoto(input: {
  website?: string | null;
  restaurantName?: string;
  excludeUrls?: Array<string | null | undefined>;
}): Promise<{ url: string; attribution: string; query: string } | null> {
  const candidates = await fetchWebsiteImageCandidates(input.website, {
    restaurantName: input.restaurantName,
    excludeUrls: input.excludeUrls,
  });
  const best = candidates[0];
  if (!best) return null;
  return {
    url: best.url,
    attribution: best.attribution,
    query: input.website?.trim() || "website",
  };
}
