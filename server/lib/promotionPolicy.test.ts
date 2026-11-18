import { describe, expect, it } from "vitest";
import { canPromote, skipsResearchedMenuAndScores } from "./promotionPolicy.ts";

describe("canPromote", () => {
  it("promotes an Overture place only when it has a website", () => {
    expect(canPromote({ source: "overture", website: "https://x.example" })).toBe(true);
    expect(canPromote({ source: "overture", website: null })).toBe(false);
    expect(canPromote({ source: "overture", website: "  " })).toBe(false);
  });

  it("can be overridden", () => {
    expect(
      canPromote(
        { source: "overture", website: null },
        { allowOvertureWithoutWebsite: true },
      ),
    ).toBe(true);
  });

  it("never holds back places from other sources", () => {
    expect(canPromote({ source: "overpass", website: null })).toBe(true);
  });
});

describe("skipsResearchedMenuAndScores", () => {
  it("skips them for a machine-promoted place whose page was not read", () => {
    expect(skipsResearchedMenuAndScores({ reviewSource: "gather-agent" }, false)).toBe(
      true,
    );
  });

  it("keeps them when the page was read", () => {
    expect(skipsResearchedMenuAndScores({ reviewSource: "gather-agent" }, true)).toBe(
      false,
    );
  });

  it("never affects hand-reviewed, curated or admin restaurants", () => {
    expect(skipsResearchedMenuAndScores({ reviewSource: "admin" }, false)).toBe(false);
    expect(skipsResearchedMenuAndScores({ reviewSource: null }, false)).toBe(false);
    expect(skipsResearchedMenuAndScores({ reviewSource: "curated" }, false)).toBe(false);
  });
});
