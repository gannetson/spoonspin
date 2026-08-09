import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminImageTarget } from "@/admin/countryTools";
import { SelectImageModal } from "@/components/SelectImageModal";
import type { Country, Drink, Recipe } from "@/types/content";
import type { Restaurant } from "@/restaurants/types";

export type SelectImageAppliedResult = {
  country?: Country;
  recipe?: Recipe | null;
  drink?: Drink;
  restaurant?: Restaurant;
  imageUrl: string;
  imageAttribution?: string | null;
};

export type OpenSelectImageOptions = {
  target: AdminImageTarget;
  label: string;
  defaultQuery: string;
  onApplied: (result: SelectImageAppliedResult) => void;
};

type SelectImageContextValue = {
  openSelectImage: (options: OpenSelectImageOptions) => void;
};

const SelectImageContext = createContext<SelectImageContextValue | null>(null);

export function SelectImageProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpenSelectImageOptions | null>(null);

  const openSelectImage = useCallback((options: OpenSelectImageOptions) => {
    setSession(options);
  }, []);

  const close = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ openSelectImage }), [openSelectImage]);

  return (
    <SelectImageContext.Provider value={value}>
      {children}
      {session ? (
        <SelectImageModal
          open
          label={session.label}
          defaultQuery={session.defaultQuery}
          target={session.target}
          onClose={close}
          onApplied={(result) => {
            session.onApplied(result);
            close();
          }}
        />
      ) : null}
    </SelectImageContext.Provider>
  );
}

export function useSelectImage(): SelectImageContextValue {
  const ctx = useContext(SelectImageContext);
  if (!ctx) {
    throw new Error("useSelectImage must be used within SelectImageProvider");
  }
  return ctx;
}
