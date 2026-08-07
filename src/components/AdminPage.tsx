import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, LogIn, X } from "lucide-react";
import {
  fetchAdminSubmissions,
  reviewSubmission,
  type AnySubmission,
  type SubmissionStatus,
} from "@/suggestions/client";

const TOKEN_KEY = "spoonspin-admin-token";

export function AdminPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [draftToken, setDraftToken] = useState(token);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(
    "pending",
  );
  const [submissions, setSubmissions] = useState<AnySubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => submissions.filter((item) => item.status === "pending").length,
    [submissions],
  );

  useEffect(() => {
    if (!token.trim()) {
      setSubmissions([]);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAdminSubmissions({
          token: token.trim(),
          status: statusFilter,
        });
        if (!cancelled) setSubmissions(rows);
      } catch (err) {
        if (!cancelled) {
          setSubmissions([]);
          setError(
            err instanceof Error ? err.message : "Could not load submissions.",
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
  }, [token, statusFilter]);

  function saveToken() {
    const next = draftToken.trim();
    sessionStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }

  async function act(item: AnySubmission, action: "approve" | "reject") {
    setBusyId(item.id);
    setError(null);
    try {
      await reviewSubmission({
        token,
        id: item.id,
        kind: item.kind,
        action,
      });
      const rows = await fetchAdminSubmissions({
        token: token.trim(),
        status: statusFilter,
      });
      setSubmissions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <a href="/" className="text-sm font-semibold text-tomato hover:underline">
          ← Back to Spoon Spin
        </a>
        <h1 className="mt-4 font-display text-5xl text-ink">Admin review</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Review community recipe and restaurant suggestions. Approved items stay
          live; rejected items are hidden. Paste the same value as{" "}
          <code className="rounded bg-parchment px-1 py-0.5 text-sm">ADMIN_TOKEN</code>{" "}
          from your <code className="rounded bg-parchment px-1 py-0.5 text-sm">.env</code>,
          then click Unlock.
        </p>

        <form
          className="mt-8 flex flex-col gap-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            saveToken();
          }}
        >
          <div className="flex-1">
            <label htmlFor="admin-token" className="text-sm font-semibold text-ink">
              Admin token
            </label>
            <input
              id="admin-token"
              type="password"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              autoComplete="current-password"
              className="mt-1 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-3 text-ink"
              placeholder="ADMIN_TOKEN from .env"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Unlock
          </button>
        </form>

        {token ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-semibold text-ink">
              Show
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as SubmissionStatus | "all")
              }
              className="min-h-11 rounded-xl border border-ink/20 bg-white px-3 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            {statusFilter === "pending" ? (
              <p className="text-sm text-ink-soft">{pendingCount} awaiting review</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 inline-flex items-center gap-2 text-ink-soft" role="status">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Loading submissions…
          </p>
        ) : null}

        {!loading && token && submissions.length === 0 ? (
          <p className="mt-8 text-ink-soft">No submissions in this filter.</p>
        ) : null}

        <ul className="mt-6 grid gap-4">
          {submissions.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                    {item.kind} · {item.status} · {item.countryName}
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-ink">
                    {item.kind === "recipe"
                      ? item.recipe.name
                      : item.restaurant.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    Query: “{item.query}”
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
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">
                      {item.restaurant.address} · {item.restaurant.city}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-ink-soft">
                    Submitted {new Date(item.createdAt).toLocaleString()}
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
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void act(item, "reject")}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-tomato/40 px-4 text-sm font-semibold text-tomato disabled:opacity-60"
                    >
                      <X className="size-4" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
