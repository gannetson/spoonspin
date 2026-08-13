import type { OrderPlatform } from "@/types/content";

/** Local badge assets. Prefer official Awin / Thuisbezorgd.nl creatives when available. */
export function platformLogoSrc(platform: OrderPlatform): string {
  switch (platform) {
    case "thuisbezorgd":
      return "/platforms/thuisbezorgd.svg";
    case "ubereats":
      return "/platforms/ubereats.svg";
    case "deliveroo":
      return "/platforms/deliveroo.svg";
    case "direct":
      return "/platforms/direct.png";
    case "other":
    default:
      return "/platforms/other.svg";
  }
}
