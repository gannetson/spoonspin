/** Thuisbezorgd.nl NL publishers programme on Awin. */
export const AWIN_THUISBEZORGD_MID = "10510";

function publisherId(): string {
  const raw = import.meta.env.VITE_AWIN_PUBLISHER_ID;
  return typeof raw === "string" ? raw.trim() : "";
}

function advertiserMid(): string {
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
