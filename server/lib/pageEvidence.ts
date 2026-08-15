/**
 * Fetch short text evidence from a venue / delivery / review page
 * (title, meta description, og:description, visible snippet).
 */

const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; cuisine evidence lookup)";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 800_000;
const MAX_SNIPPET_CHARS = 900;

export type PageEvidence = {
  url: string;
  sourceLabel: string;
  title?: string;
  description?: string;
  snippet?: string;
};

function normalizeUrl(raw: string): string | null {
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

function sourceLabelForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (host.includes("tripadvisor")) return "tripadvisor";
    if (host.includes("thuisbezorgd") || host.includes("justeattakeaway")) {
      return "thuisbezorgd";
    }
    if (host.includes("ubereats") || host.includes("uber.com")) return "ubereats";
    if (host.includes("thefork")) return "thefork";
    return "website";
  } catch {
    return "page";
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
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

function extractTitle(html: string): string | undefined {
  const og = metaContent(html, "og:title");
  if (og) return og.slice(0, 200);
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (match?.[1]) return decodeHtmlEntities(match[1].trim()).slice(0, 200);
  return undefined;
}

function extractSnippet(html: string): string | undefined {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = decodeHtmlEntities(
    withoutNoise
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  if (text.length < 40) return undefined;
  return text.slice(0, MAX_SNIPPET_CHARS);
}

/** Format evidence for LLM prompts. */
export function formatPageEvidence(evidence: PageEvidence[]): string {
  if (evidence.length === 0) return "(no page text fetched)";
  return evidence
    .map((page) => {
      const bits = [
        `[${page.sourceLabel}] ${page.url}`,
        page.title ? `title: ${page.title}` : null,
        page.description ? `description: ${page.description}` : null,
        page.snippet ? `snippet: ${page.snippet}` : null,
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n---\n");
}

/**
 * Fetch title / description / text snippet from a URL.
 * Failures return null; never throws.
 */
export async function fetchPageEvidence(
  url: string | null | undefined,
): Promise<PageEvidence | null> {
  const pageUrl = normalizeUrl(url ?? "");
  if (!pageUrl) return null;

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

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_HTML_BYTES) return null;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const finalUrl = response.url || pageUrl;

    const title = extractTitle(html);
    const description =
      metaContent(html, "og:description") ??
      metaContent(html, "description") ??
      metaContent(html, "twitter:description");
    const snippet = extractSnippet(html);

    if (!title && !description && !snippet) return null;

    return {
      url: finalUrl,
      sourceLabel: sourceLabelForUrl(finalUrl),
      title,
      description: description?.slice(0, 500),
      snippet,
    };
  } catch (error) {
    console.warn(`Page evidence fetch failed for ${pageUrl}`, error);
    return null;
  }
}

/**
 * Fetch evidence for several URLs (deduped), with limited concurrency.
 */
export async function fetchPageEvidenceMany(
  urls: Array<string | null | undefined>,
  options?: { maxPages?: number; concurrency?: number },
): Promise<PageEvidence[]> {
  const maxPages = options?.maxPages ?? 3;
  const concurrency = options?.concurrency ?? 4;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of urls) {
    const normalized = normalizeUrl(raw ?? "");
    if (!normalized) continue;
    const key = normalized.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
    if (unique.length >= maxPages) break;
  }

  const out: PageEvidence[] = [];
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((url) => fetchPageEvidence(url)));
    for (const item of results) {
      if (item) out.push(item);
    }
  }
  return out;
}
