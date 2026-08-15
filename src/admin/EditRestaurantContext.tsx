import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Restaurant } from "@/restaurants/types";
import {
  EditRestaurantModal,
  type EditRestaurantAppliedResult,
} from "@/components/EditRestaurantModal";

export type OpenEditRestaurantOptions = {
  restaurant: Restaurant;
  onApplied: (result: EditRestaurantAppliedResult) => void;
};

type EditRestaurantContextValue = {
  openEditRestaurant: (options: OpenEditRestaurantOptions) => void;
};

const EditRestaurantContext = createContext<EditRestaurantContextValue | null>(
  null,
);

export function EditRestaurantProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpenEditRestaurantOptions | null>(null);

  const openEditRestaurant = useCallback((options: OpenEditRestaurantOptions) => {
    setSession(options);
  }, []);

  const close = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ openEditRestaurant }), [openEditRestaurant]);

  return (
    <EditRestaurantContext.Provider value={value}>
      {children}
      {session ? (
        <EditRestaurantModal
          open
          restaurant={session.restaurant}
          onClose={close}
          onApplied={(result) => {
            session.onApplied(result);
            close();
          }}
        />
      ) : null}
    </EditRestaurantContext.Provider>
  );
}

export function useEditRestaurant(): EditRestaurantContextValue {
  const ctx = useContext(EditRestaurantContext);
  if (!ctx) {
    throw new Error(
      "useEditRestaurant must be used within EditRestaurantProvider",
    );
  }
  return ctx;
}
