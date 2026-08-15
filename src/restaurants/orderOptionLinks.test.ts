import { describe, expect, it } from "vitest";
import { orderOptionPlatformLinks } from "./orderOptionLinks.ts";

describe("orderOptionPlatformLinks", () => {
  it("prefers dual URL fields", () => {
    expect(
      orderOptionPlatformLinks({
        platform: "thuisbezorgd",
        url: "https://www.thuisbezorgd.nl/menu/old",
        thuisbezorgdUrl: "https://www.thuisbezorgd.nl/menu/new",
        ubereatsUrl: "https://www.ubereats.com/nl/store/a/b",
      }),
    ).toEqual({
      thuisbezorgd: "https://www.thuisbezorgd.nl/menu/new",
      ubereats: "https://www.ubereats.com/nl/store/a/b",
    });
  });

  it("falls back to legacy platform url", () => {
    expect(
      orderOptionPlatformLinks({
        platform: "ubereats",
        url: "https://www.ubereats.com/nl/store/x/y",
      }),
    ).toEqual({
      thuisbezorgd: undefined,
      ubereats: "https://www.ubereats.com/nl/store/x/y",
    });
  });
});
