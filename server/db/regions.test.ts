/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  normalizeRegionName,
  regionSlug,
  resolveCanonicalRegionName,
} from "./regions";

describe("region normalization", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizeRegionName("  Sìchuan!!! ")).toBe("sichuan");
    expect(normalizeRegionName("Inner   Mongolia")).toBe("inner mongolia");
  });

  it("resolves spelling aliases to canonical English names", () => {
    expect(resolveCanonicalRegionName("szechuan")).toBe("Sichuan");
    expect(resolveCanonicalRegionName("SZECHWAN")).toBe("Sichuan");
    expect(resolveCanonicalRegionName("Macao")).toBe("Macau");
    expect(resolveCanonicalRegionName("xizang")).toBe("Tibet");
  });

  it("title-cases unknown region names", () => {
    expect(resolveCanonicalRegionName("lower yangtze")).toBe("Lower Yangtze");
  });

  it("builds stable region slugs", () => {
    expect(regionSlug("cn", "Sichuan")).toBe("cn:sichuan");
    expect(regionSlug("cn", "Inner Mongolia")).toBe("cn:inner-mongolia");
  });
});
