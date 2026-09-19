import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOverpassBboxQuery,
  buildOverpassQuery,
  fetchOverpass,
  NL_BBOX,
} from "../../scripts/lib/overpassRestaurants.ts";

describe("buildOverpassQuery", () => {
  it("honours a short interactive timeout", () => {
    const query = buildOverpassQuery(["albanian"], 52.16, 4.5, 25000, 12);
    expect(query).toContain("[timeout:12]");
  });
});

describe("buildOverpassBboxQuery", () => {
  it("covers the Netherlands in one request", () => {
    const query = buildOverpassBboxQuery(["albanian"], NL_BBOX, 20);
    expect(query).toContain("[timeout:20]");
    expect(query).toContain("50.75,3.2,53.6,7.23");
    expect(query).not.toContain("around:");
  });
});

describe("fetchOverpass", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aborts a hung Overpass request instead of waiting forever", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    await expect(
      fetchOverpass("[out:json];out;", 1, 0, { timeoutMs: 40, maxAttempts: 1 }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
