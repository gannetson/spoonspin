import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ClipboardList, Flag, LoaderCircle, LogIn, Users } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import {
  fetchAdminOverview,
  type AdminCountryOverviewRow,
  type AdminOverviewResponse,
} from "@/admin/overview";
import { useT } from "@/i18n/LocaleContext";

type SortKey = "name" | "recipes" | "restaurants" | "drinks" | "shops";

function compareRows(
  a: AdminCountryOverviewRow,
  b: AdminCountryOverviewRow,
  key: SortKey,
): number {
  if (key === "name") return a.name.localeCompare(b.name);
  return b[key] - a[key];
}

export function AdminOverviewPage() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [query, setQuery] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setData(null);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const overview = await fetchAdminOverview();
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : t("admin.overview.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, t]);

  const rows = useMemo(() => {
    const list = data?.countries ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (row) =>
            row.name.toLowerCase().includes(q) ||
            row.code.includes(q) ||
            row.region.toLowerCase().includes(q),
        )
      : list;
    return [...filtered].sort((a, b) => compareRows(a, b, sortKey));
  }, [data, query, sortKey]);

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-sm font-semibold text-tomato hover:underline">
            {t("admin.back")}
          </Link>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/reports"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <Activity className="size-4" aria-hidden="true" />
                {t("admin.overview.toReports")}
              </Link>
              <Link
                to="/admin/users"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <Users className="size-4" aria-hidden="true" />
                {t("admin.overview.toUsers")}
              </Link>
              <Link
                to="/admin/flags"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <Flag className="size-4" aria-hidden="true" />
                {t("admin.overview.toFlags")}
              </Link>
              <Link
                to="/admin/review"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream"
              >
                <ClipboardList className="size-4" aria-hidden="true" />
                {t("admin.overview.toReview")}
              </Link>
            </div>
          ) : null}
        </div>

        <h1 className="mt-4 font-display text-5xl text-burgundy">
          {t("admin.overview.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{t("admin.overview.subtitle")}</p>

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
          <p
            role="alert"
            className="mt-8 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {t("admin.noAccess")}
          </p>
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
          <p className="mt-8 inline-flex items-center gap-2 text-ink-soft" role="status">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.overview.loading")}
          </p>
        ) : null}

        {isAdmin && data ? (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  ["countries", data.totals.countries],
                  ["recipes", data.totals.recipes],
                  ["restaurants", data.totals.restaurants],
                  ["drinks", data.totals.drinks],
                  ["shops", data.totals.shops],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                    {t(`admin.overview.metric.${key}`)}
                  </p>
                  <p className="mt-1 font-display text-3xl text-burgundy">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-end gap-3">
              <label className="block min-w-[12rem] flex-1">
                <span className="text-sm font-semibold text-ink">
                  {t("admin.overview.search")}
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("admin.overview.searchPlaceholder")}
                  className="mt-1 min-h-11 w-full rounded-xl border border-ink/20 bg-white px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  {t("admin.overview.sort")}
                </span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="mt-1 block min-h-11 rounded-xl border border-ink/20 bg-white px-3 text-sm"
                >
                  <option value="name">{t("admin.overview.sort.name")}</option>
                  <option value="recipes">{t("admin.overview.sort.recipes")}</option>
                  <option value="restaurants">
                    {t("admin.overview.sort.restaurants")}
                  </option>
                  <option value="drinks">{t("admin.overview.sort.drinks")}</option>
                  <option value="shops">{t("admin.overview.sort.shops")}</option>
                </select>
              </label>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl bg-cream ring-1 ring-ink/10">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.14em] text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {t("admin.overview.col.country")}
                    </th>
                    <th className="px-4 py-3 font-semibold tabular-nums">
                      {t("admin.overview.col.recipes")}
                    </th>
                    <th className="px-4 py-3 font-semibold tabular-nums">
                      {t("admin.overview.col.restaurants")}
                    </th>
                    <th className="px-4 py-3 font-semibold tabular-nums">
                      {t("admin.overview.col.drinks")}
                    </th>
                    <th className="px-4 py-3 font-semibold tabular-nums">
                      {t("admin.overview.col.shops")}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t("admin.overview.col.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.code}
                      className="border-t border-ink/5 hover:bg-parchment/60"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/?country=${encodeURIComponent(row.code)}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          <span className="mr-2" aria-hidden="true">
                            {row.flag}
                          </span>
                          {row.name}
                          <span className="ml-2 font-normal text-ink-soft">
                            {row.code.toUpperCase()}
                          </span>
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-soft">{row.region}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink">{row.recipes}</td>
                      <td className="px-4 py-3 tabular-nums text-ink">
                        {row.restaurants}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink">{row.drinks}</td>
                      <td className="px-4 py-3 tabular-nums text-ink">{row.shops}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {row.cookReady
                          ? t("admin.overview.status.cookReady")
                          : t("admin.overview.status.spinOnly")}
                        {" · "}
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 ? (
                <p className="px-4 py-6 text-ink-soft">{t("admin.overview.empty")}</p>
              ) : null}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
