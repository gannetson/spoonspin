import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AuthModal } from "@/components/AuthModal";

export type AuthModalMode = "login" | "register";

export type OpenAuthOptions = {
  mode?: AuthModalMode;
  onSuccess?: () => void;
};

type AuthModalContextValue = {
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

  const openAuth = useCallback((options?: OpenAuthOptions) => {
    setMode(options?.mode ?? "login");
    setOnSuccess(() => options?.onSuccess ?? null);
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
    setOnSuccess(null);
  }, []);

  const value = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        mode={mode}
        onModeChange={setMode}
        onClose={closeAuth}
        onSuccess={() => {
          const done = onSuccess;
          closeAuth();
          done?.();
        }}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
