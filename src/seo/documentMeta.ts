/** Production site origin for canonical / Open Graph URLs. */
export const SITE_ORIGIN = "https://spoonspin.nl";

export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/modes/cook.png`;

export type DocumentMetaInput = {
  title: string;
  description: string;
  /** Path or query string, e.g. `/`, `/about`, `/?country=mx`. */
  canonicalPath: string;
  image?: string;
};

function absoluteUrl(canonicalPath: string): string {
  if (canonicalPath.startsWith("http://") || canonicalPath.startsWith("https://")) {
    return canonicalPath;
  }
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  return `${SITE_ORIGIN}${path}`;
}

function upsertMetaByName(name: string, content: string): void {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Update document title, description, canonical, and social meta tags. */
export function setDocumentMeta(input: DocumentMetaInput): void {
  if (typeof document === "undefined") return;

  const url = absoluteUrl(input.canonicalPath);
  const image = input.image ?? DEFAULT_OG_IMAGE;

  document.title = input.title;
  upsertMetaByName("description", input.description);
  upsertCanonical(url);

  upsertMetaByProperty("og:type", "website");
  upsertMetaByProperty("og:site_name", "Spoonspin");
  upsertMetaByProperty("og:title", input.title);
  upsertMetaByProperty("og:description", input.description);
  upsertMetaByProperty("og:url", url);
  upsertMetaByProperty("og:image", image);

  upsertMetaByName("twitter:card", "summary_large_image");
  upsertMetaByName("twitter:title", input.title);
  upsertMetaByName("twitter:description", input.description);
  upsertMetaByName("twitter:image", image);
}

export function homeMeta(t: (key: string) => string): DocumentMetaInput {
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    canonicalPath: "/",
  };
}

export function countryMeta(
  countryName: string,
  countryCode: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): DocumentMetaInput {
  return {
    title: t("meta.country.title", { name: countryName }),
    description: t("meta.country.description", { name: countryName }),
    canonicalPath: `/?country=${encodeURIComponent(countryCode.toLowerCase())}`,
  };
}

export function recipeMeta(
  recipeName: string,
  countryName: string,
  countryCode: string,
  recipeId: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): DocumentMetaInput {
  return {
    title: t("meta.recipe.title", {
      recipe: recipeName,
      name: countryName,
    }),
    description: t("meta.recipe.description", {
      recipe: recipeName,
      name: countryName,
    }),
    canonicalPath: `/?country=${encodeURIComponent(countryCode.toLowerCase())}&recipe=${encodeURIComponent(recipeId)}`,
  };
}

export function aboutMeta(t: (key: string) => string): DocumentMetaInput {
  return {
    title: t("meta.about.title"),
    description: t("meta.about.description"),
    canonicalPath: "/about",
  };
}

export function privacyMeta(t: (key: string) => string): DocumentMetaInput {
  return {
    title: t("meta.privacy.title"),
    description: t("meta.privacy.description"),
    canonicalPath: "/privacy",
  };
}
