import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { nl } from "@/i18n/nl";

describe("affiliate public copy", () => {
  it("avoids claiming an active Thuisbezorgd affiliate programme in EN", () => {
    const blob = [
      en["cookie.banner.body"],
      en["privacy.marketing.body"],
      en["privacy.affiliate.body"],
      en["about.affiliate.body"],
    ].join("\n");

    expect(blob.toLowerCase()).not.toContain("our affiliate programme");
    expect(blob.toLowerCase()).not.toContain("commissions help fund");
    expect(blob).toMatch(/may/i);
  });

  it("avoids claiming an active programme in NL", () => {
    const blob = [
      nl["cookie.banner.body"],
      nl["privacy.marketing.body"],
      nl["privacy.affiliate.body"],
      nl["about.affiliate.body"],
    ].join("\n");

    expect(blob.toLowerCase()).not.toContain("ons affiliateprogramma");
    expect(blob.toLowerCase()).not.toContain("helpen spoonspin te financieren");
    expect(blob).toMatch(/kan/i);
  });

  it("keeps matching SEO keys across locales", () => {
    const keys = [
      "meta.title",
      "meta.description",
      "meta.country.title",
      "home.explainer.heading",
      "about.title",
      "footer.about",
    ];
    for (const key of keys) {
      expect(en[key]).toBeTruthy();
      expect(nl[key]).toBeTruthy();
    }
  });
});
