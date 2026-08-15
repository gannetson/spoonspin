import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type { AuthModalMode } from "@/auth/AuthModalContext";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

type AuthModalProps = {
  open: boolean;
  mode: AuthModalMode;
  onModeChange: (mode: AuthModalMode) => void;
  onClose: () => void;
  onSuccess: () => void;
};

type AuthProviders = {
  google: boolean;
};

function safeNextPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("error");
  const cleaned = params.toString();
  const value = cleaned ? `${pathname}?${cleaned}` : pathname;
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export function AuthModal({
  open,
  mode,
  onModeChange,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const t = useT();
  const location = useLocation();
  const { login, register } = useAuth();
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/providers", {
          credentials: "include",
        });
        if (!response.ok) return;
        const data = (await response.json()) as Partial<AuthProviders>;
        if (!cancelled) setGoogleEnabled(Boolean(data.google));
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(location.search);
    setError(params.get("error") === "oauth" ? t("login.error.oauth") : null);
    setBusy(false);
    const timer = window.setTimeout(() => {
      emailRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open, mode, location.search, t]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-[1.75rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("login.brand")}
            </p>
            <h2
              id={titleId}
              className="font-display text-3xl leading-tight text-burgundy"
            >
              {mode === "login"
                ? t("login.title.signIn")
                : t("login.title.createAccount")}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{t("login.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink"
            aria-label={t("login.closeAria")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {googleEnabled ? (
            <div className="space-y-3">
              <a
                href={`/api/auth/google?next=${encodeURIComponent(
                  safeNextPath(location.pathname, location.search),
                )}`}
                className="flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink/15 bg-white px-6 font-semibold text-ink hover:bg-parchment"
              >
                {t("login.continueGoogle")}
              </a>
              <p className="text-center text-sm text-ink-soft">{t("login.orEmail")}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="text-sm font-medium text-ink-soft">
                  {t("login.field.name")}
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-white px-4 text-ink outline-none ring-tomato/30 focus:ring-2"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("login.field.email")}
              </span>
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-white px-4 text-ink outline-none ring-tomato/30 focus:ring-2"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("login.field.password")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-white px-4 text-ink outline-none ring-tomato/30 focus:ring-2"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>

            {error ? (
              <p role="alert" className="text-sm font-semibold text-tomato">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato/90 disabled:opacity-60"
            >
              {busy
                ? t("login.submit.busy")
                : mode === "login"
                  ? t("login.submit.signIn")
                  : t("login.submit.createAccount")}
            </button>

            <p className="text-center text-sm text-ink-soft">
              {mode === "login" ? (
                <>
                  {t("login.switch.noAccount")}{" "}
                  <button
                    type="button"
                    className="font-semibold text-tomato underline-offset-2 hover:underline"
                    onClick={() => onModeChange("register")}
                  >
                    {t("login.switch.register")}
                  </button>
                </>
              ) : (
                <>
                  {t("login.switch.alreadyRegistered")}{" "}
                  <button
                    type="button"
                    className="font-semibold text-tomato underline-offset-2 hover:underline"
                    onClick={() => onModeChange("login")}
                  >
                    {t("login.switch.signIn")}
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
