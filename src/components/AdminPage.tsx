import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, LoaderCircle, LogIn, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import { useT } from "@/i18n/LocaleContext";
import {
  fetchAdminSubmissions,
  reviewSubmission,
  type AnySubmission,
  type SubmissionStatus,
} from "@/suggestions/client";

export function AdminPage() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(
    "pending",
  );
  const [submissions, setSubmissions] = useState<AnySubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const pendingCount = useMemo(
    () => submissions.filter((item) => item.status === "pending").length,
    [submissions],
  );

  useEffect(() => {
    if (!isAdmin) {
      setSubmissions([]);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAdminSubmissions({
          status: statusFilter,
        });
        if (!cancelled) setSubmissions(rows);
      } catch (err) {
        if (!cancelled) {
          setSubmissions([]);
          setError(
            err instanceof Error ? err.message : t("admin.error.load"),
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

  async function act(item: AnySubmission, action: "approve" | "reject") {
    setBusyId(item.id);
    setError(null);
    try {
      await reviewSubmission({
        id: item.id,
        kind: item.kind,
        action,
      });
      const rows = await fetchAdminSubmissions({
        status: statusFilter,
      });
      setSubmissions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.error.review"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin" className="text-sm font-semibold text-tomato hover:underline">
              {t("admin.review.backToOverview")}
            </Link>
            {isAdmin ? (
              <Link
                to="/admin/users"
                className="text-sm font-semibold text-ink-soft hover:underline"
              >
                {t("admin.overview.toUsers")}
              </Link>
            ) : null}
          </div>
        </div>
        <h1 className="mt-4 font-display text-5xl text-ink">{t("admin.title")}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{t("admin.subtitle")}</p>

        {authLoading ? (
          <p className="mt-8 inline-flex items-center gap-2 text-ink-soft" role="status">
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
          <p role="alert" className="mt-8 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato">
            {t("admin.noAccess")}
          </p>
        ) : null}

        {isAdmin ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-semibold text-ink">
              {t("admin.show")}
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as SubmissionStatus | "all")
              }
              className="min-h-11 rounded-xl border border-ink/20 bg-white px-3 text-sm"
            >
              <option value="pending">{t("admin.filter.pending")}</option>
              <option value="approved">{t("admin.filter.approved")}</option>
              <option value="rejected">{t("admin.filter.rejected")}</option>
              <option value="all">{t("admin.filter.all")}</option>
            </select>
            {statusFilter === "pending" ? (
              <p className="text-sm text-ink-soft">
                {t("admin.awaitingReview", { count: pendingCount })}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato">
            {error}
          </p>
        ) : null}

        {isAdmin && loading ? (
          <p className="mt-8 inline-flex items-center gap-2 text-ink-soft" role="status">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.loading")}
          </p>
        ) : null}

        {isAdmin && !loading && submissions.length === 0 ? (
          <p className="mt-8 text-ink-soft">{t("admin.empty")}</p>
        ) : null}

        {isAdmin ? (
          <ul className="mt-6 grid gap-4">
            {submissions.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                      {t(`admin.kind.${item.kind}`)} · {item.status} ·{" "}
                      {item.countryName}
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-ink">
                      {item.kind === "recipe"
                        ? item.recipe.name
                        : item.kind === "restaurant"
                          ? item.restaurant.name
                          : item.kind === "drink"
                            ? item.drink.name
                            : item.shop.name}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {t("admin.queryPrefix", { query: item.query })}
                    </p>
                    {item.confirmationNotes ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {item.confirmationNotes}
                      </p>
                    ) : null}
                    {item.kind === "recipe" ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {item.recipe.category} · {item.recipe.description.slice(0, 140)}
                        …
                      </p>
                    ) : null}
                    {item.kind === "restaurant" ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {item.restaurant.address} · {item.restaurant.city}
                      </p>
                    ) : null}
                    {item.kind === "drink" ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {item.drink.type} · {item.drink.description.slice(0, 140)}
                        …
                      </p>
                    ) : null}
                    {item.kind === "shop" ? (
                      <p className="mt-2 text-sm text-ink-soft">
                        {item.shop.address} · {item.shop.city} · {item.shop.specialty}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-ink-soft">
                      {t("admin.submitted", {
                        datetime: new Date(item.createdAt).toLocaleString(),
                      })}
                    </p>
                  </div>
                  {item.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void act(item, "approve")}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stamp px-4 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        <Check className="size-4" aria-hidden="true" />
                        {t("admin.approve")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void act(item, "reject")}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-tomato/40 px-4 text-sm font-semibold text-tomato disabled:opacity-60"
                      >
                        <X className="size-4" aria-hidden="true" />
                        {t("admin.reject")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
