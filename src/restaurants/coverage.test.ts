import { describe, expect, it } from "vitest";
import {
  FILL_CITIES_ORDERED,
  cityAnchorByName,
  findCityAnchorInText,
  hostCountryForPoint,
  normalizeCity,
} from "./coverage.ts";

describe("hostCountryForPoint", () => {
  it("tells the three countries apart, including right at the borders", () => {
    expect(hostCountryForPoint({ lat: 52.37, lng: 4.9 })).toBe("nl"); // Amsterdam
    expect(hostCountryForPoint({ lat: 51.22, lng: 4.4 })).toBe("be"); // Antwerp
    expect(hostCountryForPoint({ lat: 50.85, lng: 4.35 })).toBe("be"); // Brussels
    expect(hostCountryForPoint({ lat: 50.78, lng: 6.08 })).toBe("de"); // Aachen
    expect(hostCountryForPoint({ lat: 50.85, lng: 5.69 })).toBe("nl"); // Maastricht
    expect(hostCountryForPoint({ lat: 50.94, lng: 6.96 })).toBe("de"); // Cologne
  });

  it("returns null far from every known city", () => {
    expect(hostCountryForPoint({ lat: 40.4, lng: -3.7 })).toBeNull();
  });
});

describe("city lookup", () => {
  it("ignores accents and finds aliases in free text", () => {
    expect(normalizeCity("Düsseldorf")).toBe("dusseldorf");
    expect(cityAnchorByName("Cologne")?.name).toBe("Köln");
    expect(cityAnchorByName("Brussels")?.name).toBe("Brussel");
    expect(findCityAnchorInText("restaurants near Antwerp centre")?.name).toBe("Antwerpen");
    expect(findCityAnchorInText("The Hague")?.name).toBe("Den Haag");
    expect(findCityAnchorInText("nowhere special")).toBeUndefined();
  });

  it("every ordered fill city has an anchor and the Randstad hubs come first", () => {
    for (const city of FILL_CITIES_ORDERED) expect(cityAnchorByName(city), city).toBeDefined();
    expect(FILL_CITIES_ORDERED.slice(0, 5)).toEqual([
      "Leiden",
      "Amsterdam",
      "Rotterdam",
      "Den Haag",
      "Utrecht",
    ]);
  });
});
