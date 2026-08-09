import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Country, Recipe } from "@/types/content";
import {
  EditRecipeModal,
  type EditRecipeAppliedResult,
} from "@/components/EditRecipeModal";

export type OpenEditRecipeOptions = {
  country: Country;
  recipe: Recipe;
  onApplied: (result: EditRecipeAppliedResult) => void;
};

type EditRecipeContextValue = {
  openEditRecipe: (options: OpenEditRecipeOptions) => void;
};

const EditRecipeContext = createContext<EditRecipeContextValue | null>(null);

export function EditRecipeProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpenEditRecipeOptions | null>(null);

  const openEditRecipe = useCallback((options: OpenEditRecipeOptions) => {
    setSession(options);
  }, []);

  const close = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ openEditRecipe }), [openEditRecipe]);

  return (
    <EditRecipeContext.Provider value={value}>
      {children}
      {session ? (
        <EditRecipeModal
          open
          country={session.country}
          recipe={session.recipe}
          onClose={close}
          onApplied={(result) => {
            session.onApplied(result);
            close();
          }}
        />
      ) : null}
    </EditRecipeContext.Provider>
  );
}

export function useEditRecipe(): EditRecipeContextValue {
  const ctx = useContext(EditRecipeContext);
  if (!ctx) {
    throw new Error("useEditRecipe must be used within EditRecipeProvider");
  }
  return ctx;
}
