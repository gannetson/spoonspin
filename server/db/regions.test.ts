/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  normalizeRegionName,
  regionIdFromIso,
  regionSlug,
  resolveCanonicalRegionName,
} from "./regions";

describe("region normalization", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizeRegionName("  Sìchuan!!! ")).toBe("sichuan");
    expect(normalizeRegionName("Inner   Mongolia")).toBe("inner mongolia");
  });

  it("resolves spelling aliases to canonical English names", () => {
    expect(resolveCanonicalRegionName("szechuan", "cn")).toBe("Sichuan");
    expect(resolveCanonicalRegionName("SZECHWAN", "cn")).toBe("Sichuan");
    expect(resolveCanonicalRegionName("macau", "cn")).toBe("Macao");
    expect(resolveCanonicalRegionName("xizang", "cn")).toBe("Tibet");
  });

  it("matches catalog names without aliases", () => {
    expect(resolveCanonicalRegionName("sichuan", "cn")).toBe("Sichuan");
    expect(resolveCanonicalRegionName("beijing", "cn")).toBe("Beijing");
  });

  it("title-cases unknown region names", () => {
    expect(resolveCanonicalRegionName("lower yangtze", "cn")).toBe("Lower Yangtze");
  });

  it("builds stable region ids from ISO codes", () => {
    expect(regionIdFromIso("cn", "CN-SC")).toBe("cn:CN-SC");
    expect(regionIdFromIso("cn", "CN-NM")).toBe("cn:CN-NM");
  });

  it("builds slug ids for ad-hoc regions", () => {
    expect(regionSlug("cn", "Lower Yangtze")).toBe("cn:lower-yangtze");
  });
});
