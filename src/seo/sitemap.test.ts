import { describe, expect, it } from "vitest";
import { sitemapXmlForCountryCodes } from "../../server/routes/sitemap.ts";

describe("sitemapXmlForCountryCodes", () => {
  it("includes static pages and country query URLs", () => {
    const xml = sitemapXmlForCountryCodes(["mx", "nl"]);
    expect(xml).toContain("https://spoonspin.nl/");
    expect(xml).toContain("https://spoonspin.nl/about");
    expect(xml).toContain("https://spoonspin.nl/privacy");
    expect(xml).toContain("https://spoonspin.nl/?country=mx");
    expect(xml).toContain("https://spoonspin.nl/?country=nl");
  });
});
