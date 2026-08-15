import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Country, OrderOption } from "@/types/content";
import {
  EditOrderOptionModal,
  type EditOrderOptionAppliedResult,
} from "@/components/EditOrderOptionModal";

export type OpenEditOrderOptionOptions = {
  country: Country;
  option: OrderOption;
  onApplied: (result: EditOrderOptionAppliedResult) => void;
};

type EditOrderOptionContextValue = {
  openEditOrderOption: (options: OpenEditOrderOptionOptions) => void;
};

const EditOrderOptionContext = createContext<EditOrderOptionContextValue | null>(
  null,
);

export function EditOrderOptionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpenEditOrderOptionOptions | null>(null);

  const openEditOrderOption = useCallback((options: OpenEditOrderOptionOptions) => {
    setSession(options);
  }, []);

  const close = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ openEditOrderOption }), [openEditOrderOption]);

  return (
    <EditOrderOptionContext.Provider value={value}>
      {children}
      {session ? (
        <EditOrderOptionModal
          open
          country={session.country}
          option={session.option}
          onClose={close}
          onApplied={(result) => {
            session.onApplied(result);
            close();
          }}
        />
      ) : null}
    </EditOrderOptionContext.Provider>
  );
}

export function useEditOrderOption(): EditOrderOptionContextValue {
  const ctx = useContext(EditOrderOptionContext);
  if (!ctx) {
    throw new Error(
      "useEditOrderOption must be used within EditOrderOptionProvider",
    );
  }
  return ctx;
}
