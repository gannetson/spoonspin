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

describe("fetchOverpass on an overloaded mirror", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const busyPage = `<?xml version="1.0" encoding="UTF-8"?>
<html><body>
<p><strong style="color:#FF0000">Error</strong>: runtime error: open64: 0 Success /osm3s_osm_base Dispatcher_Client::request_read_and_idx::timeout. The server is probably too busy to handle your request. </p>
</body></html>`;

  it("retries on the next mirror when a 200 carries an OSM3S error page", async () => {
    // Overpass answers 200 with HTML when it is loaded; JSON.parse would
    // otherwise report an unrelated syntax error.
    const seen: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      seen.push(url);
      return Promise.resolve(
        seen.length === 1
          ? new Response(busyPage, { status: 200 })
          : new Response(JSON.stringify({ elements: [{ type: "node", id: 1 }] }), {
              status: 200,
            }),
      );
    });

    const elements = await fetchOverpass("[out:json];", 1, 0, {
      maxAttempts: 2,
      retryWaitMs: () => 0,
    });

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    expect(elements).toHaveLength(1);
  });

  it("reports the overload plainly once the mirrors are exhausted", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(busyPage, { status: 200 })),
    );

    await expect(
      fetchOverpass("[out:json];", 1, 0, { maxAttempts: 1, retryWaitMs: () => 0 }),
    ).rejects.toThrow(/busy/i);
  });
});
