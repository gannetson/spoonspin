import { describe, expect, it } from "vitest";
import {
  buildThuisbezorgdUrl,
  buildUberEatsUrl,
  hostCountryOfInput,
  isPlausibleThuisbezorgdUrl,
  isPlausibleUberEatsUrl,
  resolveOrderOptionHref,
  thuisbezorgdBrandForUrl,
} from "./deliveryLinks.ts";

describe("delivery links beyond the Netherlands", () => {
  it("knows which country a typed city is in", () => {
    expect(hostCountryOfInput("Leiden")).toBe("nl");
    expect(hostCountryOfInput("2312 AB")).toBe("nl");
    expect(hostCountryOfInput("Antwerp")).toBe("be");
    expect(hostCountryOfInput("Köln")).toBe("de");
    expect(hostCountryOfInput(undefined)).toBe("nl");
  });

  it("sends Belgian and German cities to their own platforms", () => {
    const input = { countryCode: "it", countryName: "Italy" };
    expect(buildThuisbezorgdUrl({ ...input, cityOrPostcode: "Antwerpen" })).toBe(
      "https://www.takeaway.com/be/",
    );
    expect(buildThuisbezorgdUrl({ ...input, cityOrPostcode: "Aachen" })).toBe(
      "https://www.lieferando.de/",
    );
    expect(buildUberEatsUrl({ ...input, cityOrPostcode: "Brussel" })).toBe(
      "https://www.ubereats.com/be",
    );
    // The Dutch behaviour is unchanged.
    expect(buildThuisbezorgdUrl({ ...input, cityOrPostcode: "Leiden" })).toContain(
      "thuisbezorgd.nl/bestel/leiden",
    );
  });

  it("accepts stored restaurant URLs from all three sites", () => {
    expect(isPlausibleThuisbezorgdUrl("https://www.thuisbezorgd.nl/menu/pizzadam")).toBe(true);
    expect(isPlausibleThuisbezorgdUrl("https://www.takeaway.com/be/menu/sushi-gent")).toBe(true);
    expect(
      isPlausibleThuisbezorgdUrl("https://www.lieferando.de/speisekarte/deutsches-haus-aachen"),
    ).toBe(true);
    expect(isPlausibleThuisbezorgdUrl("https://www.lieferando.de/")).toBe(false);
    expect(isPlausibleUberEatsUrl("https://www.ubereats.com/de/store/foo/abc123")).toBe(true);
    expect(isPlausibleUberEatsUrl("https://www.ubereats.com/be-en/store/foo/abc123")).toBe(true);
  });

  it("keeps a real Lieferando link instead of replacing it with a Dutch browse page", () => {
    const url = "https://www.lieferando.de/speisekarte/deutsches-haus-aachen";
    expect(
      resolveOrderOptionHref({
        platform: "thuisbezorgd",
        url,
        countryCode: "in",
        countryName: "India",
        cityOrPostcode: "Aachen",
      }),
    ).toBe(url);
  });

  it("names the brand behind a stored link", () => {
    expect(thuisbezorgdBrandForUrl("https://www.lieferando.de/speisekarte/x")).toBe("lieferando");
    expect(thuisbezorgdBrandForUrl("https://www.takeaway.com/be/menu/x")).toBe("takeaway");
    expect(thuisbezorgdBrandForUrl("https://www.thuisbezorgd.nl/menu/x")).toBe("thuisbezorgd");
  });
});
