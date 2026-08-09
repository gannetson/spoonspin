import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

function withOauthError(path: string): string {
  if (path.includes("error=oauth")) return path;
  return `${path}${path.includes("?") ? "&" : "?"}error=oauth`;
}

/** `/login` opens the auth modal on the intended next page. */
export function LoginPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const oauthFailed = searchParams.get("error") === "oauth";

  useEffect(() => {
    if (loading) return;
    navigate(oauthFailed ? withOauthError(nextPath) : nextPath, {
      replace: true,
    });
    if (!user) {
      openAuth({ mode: "login" });
    }
  }, [loading, user, openAuth, navigate, nextPath, oauthFailed]);

  return (
    <div className="passport-grid min-h-screen" aria-busy="true">
      <span className="sr-only">Loading…</span>
    </div>
  );
}
