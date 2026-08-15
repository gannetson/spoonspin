import { listPublishedCountryCodes } from "../db/content.ts";

const SITE_ORIGIN = "https://spoonspin.nl";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`;
}

/** Build sitemap XML from published country codes (testable without DB). */
export function sitemapXmlForCountryCodes(codes: string[]): string {
  const entries = [
    urlEntry(`${SITE_ORIGIN}/`),
    urlEntry(`${SITE_ORIGIN}/about`),
    urlEntry(`${SITE_ORIGIN}/privacy`),
    ...codes.map((code) =>
      urlEntry(`${SITE_ORIGIN}/?country=${encodeURIComponent(code)}`),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

export async function buildSitemapXml(): Promise<string> {
  const codes = await listPublishedCountryCodes();
  return sitemapXmlForCountryCodes(codes);
}

export function registerSitemapRoutes(app: import("express").Express): void {
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await buildSitemapXml();
      res
        .status(200)
        .type("application/xml")
        .set("Cache-Control", "public, max-age=3600")
        .send(xml);
    } catch (error) {
      console.error("Sitemap generation failed", error);
      res.status(500).type("text/plain").send("Could not generate sitemap.");
    }
  });
}
