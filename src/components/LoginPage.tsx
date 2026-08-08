import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useT } from "@/i18n/LocaleContext";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginPage() {
  const t = useT();
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="passport-grid min-h-screen">
        <main className="mx-auto max-w-md px-4 py-16">
          <h1 className="font-display text-3xl text-ink">
            {t("login.signedIn.title")}
          </h1>
          <p className="mt-3 text-ink-soft">
            {t("login.signedIn.message", { email: user.email })}
          </p>
          <Link
            to={nextPath}
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-tomato px-6 font-semibold text-cream"
          >
            {t("login.signedIn.continue")}
          </Link>
        </main>
      </div>
    );
  }

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
      navigate(nextPath);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("login.error.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-2xl text-tomato">{t("login.brand")}</p>
        </div>
        <h1 className="mt-4 font-display text-4xl text-ink">
          {mode === "login"
            ? t("login.title.signIn")
            : t("login.title.createAccount")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("login.subtitle")}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === "register" ? (
            <label className="block">
              <span className="text-sm font-medium text-ink-soft">
                {t("login.field.name")}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-cream px-4 text-ink"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-ink-soft">
              {t("login.field.email")}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-cream px-4 text-ink"
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
              className="mt-1 min-h-12 w-full rounded-full border-2 border-ink/15 bg-cream px-4 text-ink"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-tomato">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-full bg-tomato px-6 font-semibold text-cream disabled:opacity-60"
          >
            {busy
              ? t("login.submit.busy")
              : mode === "login"
                ? t("login.submit.signIn")
                : t("login.submit.createAccount")}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-soft">
          {mode === "login" ? (
            <>
              {t("login.switch.noAccount")}{" "}
              <button
                type="button"
                className="font-semibold text-tomato underline"
                onClick={() => setMode("register")}
              >
                {t("login.switch.register")}
              </button>
            </>
          ) : (
            <>
              {t("login.switch.alreadyRegistered")}{" "}
              <button
                type="button"
                className="font-semibold text-tomato underline"
                onClick={() => setMode("login")}
              >
                {t("login.switch.signIn")}
              </button>
            </>
          )}
        </p>

        <Link to="/" className="mt-8 inline-block text-sm text-ink-soft underline">
          {t("login.backHome")}
        </Link>
      </main>
    </div>
  );
}
