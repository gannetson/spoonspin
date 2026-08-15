import type { OrderOption, OrderPlatform } from "@/types/content";
import {
  isPlausibleThuisbezorgdUrl,
  isPlausibleUberEatsUrl,
  resolveOrderOptionHref,
} from "@/restaurants/deliveryLinks";

export type OrderOptionPlatformLinks = {
  thuisbezorgd?: string;
  ubereats?: string;
};

/** Resolve TB / UE links from dual fields with legacy url+platform fallback. */
export function orderOptionPlatformLinks(
  option: Pick<
    OrderOption,
    "platform" | "url" | "thuisbezorgdUrl" | "ubereatsUrl"
  >,
): OrderOptionPlatformLinks {
  let thuisbezorgd = option.thuisbezorgdUrl?.trim() || undefined;
  let ubereats = option.ubereatsUrl?.trim() || undefined;
  const legacy = option.url?.trim() || undefined;

  if (legacy) {
    if (option.platform === "thuisbezorgd" && !thuisbezorgd) {
      thuisbezorgd = legacy;
    } else if (option.platform === "ubereats" && !ubereats) {
      ubereats = legacy;
    } else if (!thuisbezorgd && !ubereats) {
      if (isPlausibleThuisbezorgdUrl(legacy)) thuisbezorgd = legacy;
      else if (isPlausibleUberEatsUrl(legacy)) ubereats = legacy;
    }
  }

  return { thuisbezorgd, ubereats };
}

export function orderOptionCuisineCodes(
  option: Pick<OrderOption, "cuisineCodes">,
  fallbackCountryCode?: string,
): string[] {
  const codes = Array.from(
    new Set(
      (option.cuisineCodes ?? [])
        .map((code) => code.trim().toLowerCase())
        .filter((code) => /^[a-z]{2}$/.test(code)),
    ),
  );
  if (codes.length > 0) return codes;
  const fallback = fallbackCountryCode?.trim().toLowerCase();
  return fallback && /^[a-z]{2}$/.test(fallback) ? [fallback] : [];
}

/** Keep legacy platform+url aligned with dual link fields for older UI paths. */
export function syncOrderOptionPrimaryLink(input: {
  name: string;
  platform?: OrderPlatform;
  url?: string;
  thuisbezorgdUrl?: string | null;
  ubereatsUrl?: string | null;
}): Pick<OrderOption, "platform" | "url" | "thuisbezorgdUrl" | "ubereatsUrl"> {
  const thuisbezorgdUrl = input.thuisbezorgdUrl?.trim() || undefined;
  const ubereatsUrl = input.ubereatsUrl?.trim() || undefined;
  const links = orderOptionPlatformLinks({
    platform: input.platform ?? "other",
    url: input.url ?? "",
    thuisbezorgdUrl,
    ubereatsUrl,
  });

  if (links.thuisbezorgd && links.ubereats) {
    const prefer =
      input.platform === "ubereats" ? links.ubereats : links.thuisbezorgd;
    const platform: OrderPlatform =
      prefer === links.ubereats ? "ubereats" : "thuisbezorgd";
    return {
      platform,
      url: prefer,
      thuisbezorgdUrl: links.thuisbezorgd,
      ubereatsUrl: links.ubereats,
    };
  }
  if (links.thuisbezorgd) {
    return {
      platform: "thuisbezorgd",
      url: links.thuisbezorgd,
      thuisbezorgdUrl: links.thuisbezorgd,
      ubereatsUrl: undefined,
    };
  }
  if (links.ubereats) {
    return {
      platform: "ubereats",
      url: links.ubereats,
      thuisbezorgdUrl: undefined,
      ubereatsUrl: links.ubereats,
    };
  }

  const url = input.url?.trim();
  if (url) {
    return {
      platform: input.platform ?? "other",
      url,
      thuisbezorgdUrl: undefined,
      ubereatsUrl: undefined,
    };
  }

  throw new Error("Order option needs at least one platform link.");
}

export function resolveOrderPlatformHref(input: {
  platform: "thuisbezorgd" | "ubereats";
  url: string;
  countryCode: string;
  countryName: string;
  cityOrPostcode?: string;
  marketingAllowed?: boolean;
}): string {
  return resolveOrderOptionHref({
    platform: input.platform,
    url: input.url,
    countryCode: input.countryCode,
    countryName: input.countryName,
    cityOrPostcode: input.cityOrPostcode,
    marketingAllowed: input.marketingAllowed,
  });
}
