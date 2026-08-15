import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  acceptMarketingConsent,
  getConsent,
  rejectMarketingConsent,
  subscribe,
} from "./storage";
import type { CookieConsent } from "./types";

type ConsentContextValue = {
  consent: CookieConsent | null;
  hasDecided: boolean;
  marketingAllowed: boolean;
  acceptMarketing: () => void;
  rejectMarketing: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function getServerConsentSnapshot(): CookieConsent | null {
  return null;
}

function useConsentSnapshot(): CookieConsent | null {
  return useSyncExternalStore(subscribe, getConsent, getServerConsentSnapshot);
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const consent = useConsentSnapshot();

  const acceptMarketing = useCallback(() => {
    acceptMarketingConsent();
  }, []);

  const rejectMarketing = useCallback(() => {
    rejectMarketingConsent();
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasDecided: consent !== null,
      marketingAllowed: consent?.marketing === true,
      acceptMarketing,
      rejectMarketing,
    }),
    [consent, acceptMarketing, rejectMarketing],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}
