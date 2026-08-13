import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Flag,
  LoaderCircle,
  LogIn,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import {
  fetchAdminFlags,
  flagEntityHref,
  updateAdminFlagStatus,
  type AdminContentFlag,
  type ContentFlagStatus,
} from "@/admin/flags";
import { useT } from "@/i18n/LocaleContext";

type StatusFilter = ContentFlagStatus | "all";

export function AdminFlagsPage() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [flags, setFlags] = useState<AdminContentFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const openCount = useMemo(
    () => flags.filter((item) => item.status === "open").length,
    [flags],
  );

  useEffect(() => {
    if (!isAdmin) {
      setFlags([]);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAdminFlags(statusFilter);
        if (!cancelled) setFlags(rows);
      } catch (err) {
        if (!cancelled) {
          setFlags([]);
          setError(
            err instanceof Error ? err.message : t("admin.flags.error.load"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, statusFilter, t]);

  async function setStatus(item: AdminContentFlag, status: ContentFlagStatus) {
    setBusyId(item.id);
    setError(null);
    try {
      await updateAdminFlagStatus(item.id, status);
      const rows = await fetchAdminFlags(statusFilter);
      setFlags(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.flags.error.update"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin"
            className="text-sm font-semibold text-tomato hover:underline"
          >
            {t("admin.flags.backToOverview")}
          </Link>
          {isAdmin ? (
            <Link
              to="/admin/review"
              className="text-sm font-semibold text-ink-soft hover:underline"
            >
              {t("admin.flags.toReview")}
            </Link>
          ) : null}
        </div>

        <h1 className="mt-4 font-display text-5xl text-burgundy">
          {t("admin.flags.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{t("admin.flags.subtitle")}</p>

        {authLoading ? (
          <p
            className="mt-8 inline-flex items-center gap-2 text-ink-soft"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.checkingAccess")}
          </p>
        ) : null}

        {!authLoading && !user ? (
          <div className="mt-8 rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
            <p className="text-ink-soft">{t("admin.signInPrompt")}</p>
            <button
              type="button"
              onClick={() => openAuth({ mode: "login" })}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream"
            >
              <LogIn className="size-4" aria-hidden="true" />
              {t("admin.signIn")}
            </button>
          </div>
        ) : null}

        {!authLoading && user && !isAdmin ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {t("admin.noAccess")}
          </p>
        ) : null}

        {isAdmin ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label
              htmlFor="flag-status-filter"
              className="text-sm font-semibold text-burgundy"
            >
              {t("admin.show")}
            </label>
            <select
              id="flag-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="min-h-11 rounded-xl border border-burgundy/20 bg-white px-3 text-sm text-burgundy"
            >
              <option value="open">{t("admin.flags.filter.open")}</option>
              <option value="resolved">{t("admin.flags.filter.resolved")}</option>
              <option value="dismissed">
                {t("admin.flags.filter.dismissed")}
              </option>
              <option value="all">{t("admin.flags.filter.all")}</option>
            </select>
            {statusFilter === "open" ? (
              <p className="text-sm text-ink-soft">
                {t("admin.flags.openCount", { count: openCount })}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {error}
          </p>
        ) : null}

        {isAdmin && loading ? (
          <p
            className="mt-8 inline-flex items-center gap-2 text-ink-soft"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.flags.loading")}
          </p>
        ) : null}

        {isAdmin && !loading && flags.length === 0 ? (
          <p className="mt-8 text-ink-soft">{t("admin.flags.empty")}</p>
        ) : null}

        {isAdmin ? (
          <ul className="mt-6 grid gap-4">
            {flags.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                      {t(`admin.kind.${item.entityType}`)} · {item.status} ·{" "}
                      {item.countryCode.toUpperCase()}
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-burgundy">
                      <Link
                        to={flagEntityHref(item)}
                        className="hover:text-tomato hover:underline"
                      >
                        {item.entityName}
                      </Link>
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                      {item.reason}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {t("admin.flags.reportedBy", {
                        who:
                          item.reporterName?.trim() ||
                          item.reporterEmail ||
                          t("admin.flags.unknownUser"),
                      })}
                      {item.reporterEmail && item.reporterName?.trim()
                        ? ` · ${item.reporterEmail}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {t("admin.flags.submitted", {
                        datetime: new Date(item.createdAt).toLocaleString(),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status === "open" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item, "resolved")}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stamp px-4 text-sm font-semibold text-cream disabled:opacity-60"
                        >
                          <Check className="size-4" aria-hidden="true" />
                          {t("admin.flags.resolve")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item, "dismissed")}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-tomato/40 px-4 text-sm font-semibold text-tomato disabled:opacity-60"
                        >
                          <X className="size-4" aria-hidden="true" />
                          {t("admin.flags.dismiss")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void setStatus(item, "open")}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink disabled:opacity-60"
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        {t("admin.flags.reopen")}
                      </button>
                    )}
                    <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-parchment px-3 text-xs font-semibold text-ink-soft">
                      <Flag className="size-3.5" aria-hidden="true" />
                      {item.entityType}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
