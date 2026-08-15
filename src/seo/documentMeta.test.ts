import { describe, expect, it, beforeEach } from "vitest";
import {
  countryMeta,
  homeMeta,
  recipeMeta,
  setDocumentMeta,
  SITE_ORIGIN,
} from "./documentMeta";
import { en } from "@/i18n/en";
import { interpolate } from "@/i18n/types";

function t(key: string, vars?: Record<string, string | number>) {
  return interpolate(en[key] ?? key, vars);
}

describe("documentMeta builders", () => {
  it("builds homepage defaults", () => {
    const meta = homeMeta(t);
    expect(meta.title).toContain("Spoonspin");
    expect(meta.description.toLowerCase()).toContain("discover");
    expect(meta.canonicalPath).toBe("/");
  });

  it("builds country meta from country name", () => {
    const meta = countryMeta("Mexico", "mx", t);
    expect(meta.title).toBe("Mexico Food — Recipes, Restaurants & Delivery | Spoonspin");
    expect(meta.description).toContain("Mexico");
    expect(meta.canonicalPath).toBe("/?country=mx");
  });

  it("builds recipe meta with recipe id in canonical", () => {
    const meta = recipeMeta("Tacos", "Mexico", "mx", "tacos-al-pastor", t);
    expect(meta.title).toContain("Tacos");
    expect(meta.title).toContain("Mexico");
    expect(meta.canonicalPath).toContain("country=mx");
    expect(meta.canonicalPath).toContain("recipe=tacos-al-pastor");
  });
});

describe("setDocumentMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("writes title, description, canonical, and social tags", () => {
    setDocumentMeta({
      title: "Test Title",
      description: "Test description for SEO.",
      canonicalPath: "/?country=nl",
    });

    expect(document.title).toBe("Test Title");
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe("Test description for SEO.");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      `${SITE_ORIGIN}/?country=nl`,
    );
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe("Test Title");
    expect(
      document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
    ).toBe(`${SITE_ORIGIN}/?country=nl`);
    expect(
      document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
    ).toBe("summary_large_image");
  });
});
