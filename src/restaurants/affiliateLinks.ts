/** Thuisbezorgd.nl NL publishers programme on Awin. */
import { getPublicConfig } from "../lib/publicConfig.ts";

export const AWIN_THUISBEZORGD_MID = "10510";

function publisherId(): string {
  const runtime = getPublicConfig().awinPublisherId?.trim();
  if (runtime) return runtime;
  const raw = import.meta.env.VITE_AWIN_PUBLISHER_ID;
  return typeof raw === "string" ? raw.trim() : "";
}

function advertiserMid(): string {
  const runtime = getPublicConfig().awinThuisbezorgdMid?.trim();
  if (runtime) return runtime;
  const raw = import.meta.env.VITE_AWIN_THUISBEZORGD_MID;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return AWIN_THUISBEZORGD_MID;
}

/**
 * Wrap a clean Thuisbezorgd.nl destination in an Awin deep link when marketing
 * consent is granted and a publisher ID is configured. Otherwise return the
 * destination unchanged (no affiliate cookie / no commission).
 */
export function wrapThuisbezorgdAffiliateUrl(
  destination: string,
  opts: { marketingAllowed: boolean },
): string {
  if (!opts.marketingAllowed) return destination;

  const affId = publisherId();
  if (!affId) return destination;

  let clean: URL;
  try {
    clean = new URL(destination);
  } catch {
    return destination;
  }
  if (!/(^|\.)thuisbezorgd\.nl$/i.test(clean.hostname)) {
    return destination;
  }

  const mid = advertiserMid();
  const params = new URLSearchParams({
    awinmid: mid,
    awinaffid: affId,
    ued: clean.toString(),
  });
  return `https://www.awin1.com/cread.php?${params.toString()}`;
}

/** Optional PLUS.nl Awin programme MID — leave unset until configured. */
export const AWIN_PLUS_MID_DEFAULT = "";

function plusPublisherId(): string {
  return publisherId();
}

function plusAdvertiserMid(): string {
  const raw =
    (typeof import.meta.env.VITE_AWIN_PLUS_MID === "string"
      ? import.meta.env.VITE_AWIN_PLUS_MID
      : "") || "";
  return raw.trim() || AWIN_PLUS_MID_DEFAULT;
}

/**
 * Wrap a plus.nl destination in an Awin deep link when marketing consent,
 * publisher id, and PLUS advertiser MID are all set. Otherwise return the
 * destination unchanged.
 */
export function wrapPlusAffiliateUrl(
  destination: string,
  opts: { marketingAllowed: boolean; clickref?: string },
): string {
  if (!opts.marketingAllowed) return destination;

  const affId = plusPublisherId();
  const mid = plusAdvertiserMid();
  if (!affId || !mid) return destination;

  let clean: URL;
  try {
    clean = new URL(destination);
  } catch {
    return destination;
  }
  if (!/(^|\.)plus\.nl$/i.test(clean.hostname)) {
    return destination;
  }

  const params = new URLSearchParams({
    awinmid: mid,
    awinaffid: affId,
    ued: clean.toString(),
  });
  if (opts.clickref?.trim()) {
    params.set("clickref", opts.clickref.trim());
  }
  return `https://www.awin1.com/cread.php?${params.toString()}`;
}
