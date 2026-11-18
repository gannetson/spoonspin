import { describe, expect, it } from "vitest";
import {
  buildTiles,
  harvestTile,
  isLoadError,
  orderTiles,
  splitTile,
  tagSignature,
  unionCuisineTags,
} from "./overpassTiles.ts";
import {
  NL_BBOX,
  cityFromTags,
  elementToRestaurantForCodes,
  type OverpassElement,
} from "./overpassRestaurants.ts";

describe("buildTiles", () => {
  it("covers the whole bounding box with no gaps", () => {
    const tiles = buildTiles(NL_BBOX, 0.5);
    expect(Math.min(...tiles.map((t) => t.south))).toBe(NL_BBOX.south);
    expect(Math.max(...tiles.map((t) => t.north))).toBe(NL_BBOX.north);
    expect(Math.min(...tiles.map((t) => t.west))).toBe(NL_BBOX.west);
    expect(Math.max(...tiles.map((t) => t.east))).toBe(NL_BBOX.east);
    // 50.75..53.6 is 6 rows, 3.2..7.23 is 9 columns.
    expect(tiles).toHaveLength(54);
  });

  it("never reaches outside the box and gives every tile a unique, stable id", () => {
    const tiles = buildTiles(NL_BBOX, 0.5);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(tiles.length);
    for (const t of tiles) {
      expect(t.north).toBeLessThanOrEqual(NL_BBOX.north);
      expect(t.east).toBeLessThanOrEqual(NL_BBOX.east);
      expect(t.south).toBeLessThan(t.north);
      expect(t.west).toBeLessThan(t.east);
    }
    expect(buildTiles(NL_BBOX, 0.5).map((t) => t.id)).toEqual(tiles.map((t) => t.id));
  });

  it("a different tile size makes different ids, so changing it searches again", () => {
    const a = new Set(buildTiles(NL_BBOX, 0.5).map((t) => t.id));
    expect(buildTiles(NL_BBOX, 0.25).some((t) => a.has(t.id))).toBe(false);
  });

  it("rejects a non-positive size", () => {
    expect(() => buildTiles(NL_BBOX, 0)).toThrow();
  });
});

describe("splitTile", () => {
  it("makes four quarters that exactly cover the parent", () => {
    const [tile] = buildTiles({ south: 52, west: 4, north: 52.5, east: 4.5 }, 0.5);
    const parts = splitTile(tile!);
    expect(parts).toHaveLength(4);
    expect(parts.map((p) => p.id)).toEqual([`${tile!.id}/0`, `${tile!.id}/1`, `${tile!.id}/2`, `${tile!.id}/3`]);
    const area = (t: { south: number; north: number; west: number; east: number }) =>
      (t.north - t.south) * (t.east - t.west);
    expect(parts.reduce((sum, p) => sum + area(p), 0)).toBeCloseTo(area(tile!), 9);
    expect(Math.min(...parts.map((p) => p.south))).toBe(tile!.south);
    expect(Math.max(...parts.map((p) => p.north))).toBe(tile!.north);
  });
});

describe("orderTiles", () => {
  it("puts the tile around a hub first", () => {
    const tiles = buildTiles(NL_BBOX, 0.5);
    const leiden = { id: "leiden", name: "Leiden", lat: 52.1601, lng: 4.497 };
    const first = orderTiles(tiles, [leiden])[0]!;
    expect(first.south).toBeLessThanOrEqual(leiden.lat);
    expect(first.north).toBeGreaterThanOrEqual(leiden.lat);
    expect(first.west).toBeLessThanOrEqual(leiden.lng);
    expect(first.east).toBeGreaterThanOrEqual(leiden.lng);
  });

  it("keeps grid order with no hubs", () => {
    const tiles = buildTiles(NL_BBOX, 0.5);
    expect(orderTiles(tiles, [])).toEqual(tiles);
  });
});

describe("cuisine tags", () => {
  it("the union covers several countries once and is sorted", () => {
    const tags = unionCuisineTags(["cn", "th", "cn"]);
    expect(tags).toEqual([...new Set(tags)].sort());
    expect(tags.length).toBeGreaterThan(0);
  });

  it("the signature changes when the country set changes", () => {
    expect(tagSignature(unionCuisineTags(["cn"]))).not.toBe(tagSignature(unionCuisineTags(["cn", "th"])));
    expect(tagSignature(unionCuisineTags(["cn"]))).toBe(tagSignature(unionCuisineTags(["cn"])));
  });
});

describe("elementToRestaurantForCodes", () => {
  const place = (cuisine: string, extra: Record<string, string> = {}): OverpassElement => ({
    type: "node",
    id: 7,
    lat: 52.1,
    lon: 4.5,
    tags: { name: "Test", amenity: "restaurant", cuisine, ...extra },
  });
  const tags = unionCuisineTags(["cn", "th"]);
  const cnTag = tags.find((t) => unionCuisineTags(["cn"]).includes(t) && !unionCuisineTags(["th"]).includes(t))!;
  const thTag = tags.find((t) => unionCuisineTags(["th"]).includes(t) && !unionCuisineTags(["cn"]).includes(t))!;

  it("tags a place with every matching country", () => {
    const row = elementToRestaurantForCodes(place(`${cnTag};${thTag}`), ["cn", "th", "jp"]);
    expect(row?.cuisineCodes.sort()).toEqual(["cn", "th"]);
    expect(row?.id).toBe("osm:node/7");
  });

  it("is null without a name or without a matching cuisine", () => {
    expect(elementToRestaurantForCodes({ ...place(cnTag), tags: { cuisine: cnTag } }, ["cn"])).toBeNull();
    expect(elementToRestaurantForCodes(place("dutch_pancake_unknown"), ["cn", "th"])).toBeNull();
    expect(elementToRestaurantForCodes(place(cnTag), ["th"])).toBeNull();
  });

  it("reads the place name from the broadest address key that exists, else leaves the country", () => {
    expect(cityFromTags({ "addr:town": "Katwijk" })).toBe("Katwijk");
    expect(cityFromTags({ "addr:city": "Leiden", "addr:town": "Katwijk" })).toBe("Leiden");
    expect(cityFromTags({ "addr:village": "Oegstgeest" })).toBe("Oegstgeest");
    expect(cityFromTags({})).toBe("");
    expect(elementToRestaurantForCodes(place(cnTag), ["cn"])?.city).toBe("Netherlands");
    expect(elementToRestaurantForCodes(place(cnTag, { "addr:village": "Voorhout" }), ["cn"])?.city).toBe("Voorhout");
  });
});

describe("isLoadError", () => {
  it("splits on overload and timeouts, not on a bad query", () => {
    expect(isLoadError(new Error("Overpass busy: runtime error: Query timed out"))).toBe(true);
    expect(isLoadError(new Error("Overpass 504: gateway"))).toBe(true);
    const abort = new Error("aborted");
    abort.name = "TimeoutError";
    expect(isLoadError(abort)).toBe(true);
    expect(isLoadError(new Error("Overpass 400: parse error"))).toBe(false);
    expect(isLoadError("nope")).toBe(false);
  });
});

describe("harvestTile", () => {
  const [tile] = buildTiles({ south: 52, west: 4, north: 52.5, east: 4.5 }, 0.5);
  const cnTag = unionCuisineTags(["cn"])[0]!;
  const node = (id: number): OverpassElement => ({
    type: "node",
    id,
    lat: 52.1,
    lon: 4.2,
    tags: { name: `R${id}`, cuisine: cnTag },
  });

  it("one request when the tile is small enough", async () => {
    let calls = 0;
    const result = await harvestTile(tile!, ["cn"], {
      delayMs: 0,
      fetchElements: async () => {
        calls += 1;
        return [node(1), node(2)];
      },
    });
    expect(calls).toBe(1);
    expect(result.places.map((p) => p.osmId)).toEqual(["node/1", "node/2"]);
    expect(result).toMatchObject({ requests: 1, splits: 0, failed: [] });
  });

  it("splits a too-heavy tile in four, merges the answers and drops duplicates on the borders", async () => {
    let calls = 0;
    const result = await harvestTile(tile!, ["cn"], {
      delayMs: 0,
      fetchElements: async () => {
        calls += 1;
        if (calls === 1) throw new Error("Overpass busy: runtime error: Query timed out");
        // Every quarter returns the same border place plus one of its own.
        return [node(100), node(calls)];
      },
    });
    expect(result.splits).toBe(1);
    expect(result.requests).toBe(5);
    expect(result.failed).toEqual([]);
    expect(new Set(result.places.map((p) => p.osmId)).size).toBe(result.places.length);
    expect(result.places.map((p) => p.osmId)).toContain("node/100");
  });

  it("reports sub-tiles that still fail instead of throwing, and keeps what it found", async () => {
    let calls = 0;
    const result = await harvestTile(tile!, ["cn"], {
      delayMs: 0,
      maxDepth: 1,
      fetchElements: async () => {
        calls += 1;
        if (calls === 1) throw new Error("Overpass 504: gateway");
        if (calls === 3) throw new Error("Overpass 504: gateway");
        return [node(calls)];
      },
    });
    expect(result.failed).toHaveLength(1);
    expect(result.places.length).toBe(3);
  });

  it("does not split on a real query error", async () => {
    let calls = 0;
    await expect(
      harvestTile(tile!, ["cn"], {
        delayMs: 0,
        fetchElements: async () => {
          calls += 1;
          throw new Error("Overpass 400: parse error");
        },
      }),
    ).rejects.toThrow(/400/);
    expect(calls).toBe(1);
  });

  it("asks for all cuisines of all countries in one query", async () => {
    let query = "";
    await harvestTile(tile!, ["cn", "th"], {
      delayMs: 0,
      fetchElements: async (q) => {
        query = q;
        return [];
      },
    });
    for (const tag of unionCuisineTags(["cn", "th"])) expect(query).toContain(tag);
    expect(query).toContain(`(${tile!.south},${tile!.west},${tile!.north},${tile!.east})`);
  });
});
