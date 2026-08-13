import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AWIN_THUISBEZORGD_MID,
  wrapThuisbezorgdAffiliateUrl,
} from "./affiliateLinks";
import { getPublicConfig } from "../lib/publicConfig";

vi.mock("../lib/publicConfig", () => ({
  getPublicConfig: vi.fn(() => ({
    awinPublisherId: null,
    awinThuisbezorgdMid: null,
  })),
}));

const TB_URL = "https://www.thuisbezorgd.nl/bestel/amsterdam/italiaans";

describe("wrapThuisbezorgdAffiliateUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getPublicConfig).mockReturnValue({
      awinPublisherId: null,
      awinThuisbezorgdMid: null,
    });
  });

  it("returns the destination when marketing is not allowed", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "99999");
    expect(
      wrapThuisbezorgdAffiliateUrl(TB_URL, { marketingAllowed: false }),
    ).toBe(TB_URL);
  });

  it("returns the destination when publisher id is missing", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "");
    expect(
      wrapThuisbezorgdAffiliateUrl(TB_URL, { marketingAllowed: true }),
    ).toBe(TB_URL);
  });

  it("wraps Thuisbezorgd.nl URLs with Awin when consent and publisher id are set", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "424242");
    const wrapped = wrapThuisbezorgdAffiliateUrl(TB_URL, {
      marketingAllowed: true,
    });
    const url = new URL(wrapped);
    expect(url.origin).toBe("https://www.awin1.com");
    expect(url.pathname).toBe("/cread.php");
    expect(url.searchParams.get("awinmid")).toBe(AWIN_THUISBEZORGD_MID);
    expect(url.searchParams.get("awinaffid")).toBe("424242");
    expect(url.searchParams.get("ued")).toBe(TB_URL);
  });

  it("prefers runtime public config over Vite env", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "111");
    vi.mocked(getPublicConfig).mockReturnValue({
      awinPublisherId: "222",
      awinThuisbezorgdMid: null,
    });
    const wrapped = wrapThuisbezorgdAffiliateUrl(TB_URL, {
      marketingAllowed: true,
    });
    expect(new URL(wrapped).searchParams.get("awinaffid")).toBe("222");
  });

  it("does not wrap non-Thuisbezorgd destinations", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "424242");
    const uber = "https://www.ubereats.com/nl/city/amsterdam-noord-holland";
    expect(
      wrapThuisbezorgdAffiliateUrl(uber, { marketingAllowed: true }),
    ).toBe(uber);
  });

  it("respects VITE_AWIN_THUISBEZORGD_MID override", () => {
    vi.stubEnv("VITE_AWIN_PUBLISHER_ID", "1");
    vi.stubEnv("VITE_AWIN_THUISBEZORGD_MID", "999");
    const wrapped = wrapThuisbezorgdAffiliateUrl(TB_URL, {
      marketingAllowed: true,
    });
    expect(new URL(wrapped).searchParams.get("awinmid")).toBe("999");
  });
});
