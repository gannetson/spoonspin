/** Stored cookie consent choice (AVG / ePrivacy). */
export type CookieConsent = {
  /** Always true — session/OAuth and similar essential cookies. */
  necessary: true;
  /** Marketing / affiliate tracking (e.g. Awin for Thuisbezorgd.nl). */
  marketing: boolean;
  updatedAt: string;
};
