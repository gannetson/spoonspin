import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import {
  fetchAdminReports,
  type AdminReportsResponse,
  type ReportRange,
} from "@/admin/reports";
import { useT } from "@/i18n/LocaleContext";

const RANGES: ReportRange[] = ["24h", "7d", "30d"];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBucket(iso: string, range: ReportRange): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (range === "24h") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function TrafficChart({
  series,
  range,
}: {
  series: AdminReportsResponse["series"];
  range: ReportRange;
}) {
  const t = useT();
  if (series.length === 0) {
    return (
      <p className="text-sm text-ink-soft">{t("admin.reports.chartEmpty")}</p>
    );
  }

  const max = Math.max(1, ...series.map((point) => point.requests));
  const width = 640;
  const height = 180;
  const padX = 8;
  const padY = 12;
  const barGap = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const barW = Math.max(2, (innerW - barGap * (series.length - 1)) / series.length);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full min-w-[20rem] text-ink"
        role="img"
        aria-label={t("admin.reports.chartLabel")}
      >
        {series.map((point, index) => {
          const reqH = (point.requests / max) * innerH;
          const errH = (point.errors / max) * innerH;
          const x = padX + index * (barW + barGap);
          const y = padY + innerH - reqH;
          return (
            <g key={point.bucket}>
              <title>
                {`${formatBucket(point.bucket, range)}: ${point.requests} ${t("admin.reports.requests")}, ${point.errors} ${t("admin.reports.errors")}`}
              </title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(reqH, point.requests > 0 ? 1 : 0)}
                className="fill-ink/25"
                rx={1}
              />
              {point.errors > 0 ? (
                <rect
                  x={x}
                  y={padY + innerH - errH}
                  width={barW}
                  height={Math.max(errH, 1)}
                  className="fill-tomato/80"
                  rx={1}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>{formatBucket(series[0]!.bucket, range)}</span>
        <span>{formatBucket(series[series.length - 1]!.bucket, range)}</span>
      </div>
    </div>
  );
}

export function AdminReportsPage() {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const [range, setRange] = useState<ReportRange>("7d");
  const [data, setData] = useState<AdminReportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const reports = await fetchAdminReports(range);
        if (!cancelled) setData(reports);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error ? err.message : t("admin.reports.error"),
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
  }, [isAdmin, range, t]);

  const productTotals = data?.product.totals ?? {};

  return (
    <div className="passport-grid min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-semibold text-tomato hover:underline"
          >
            {t("admin.back")}
          </Link>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
                {t("admin.reports.toOverview")}
              </Link>
              <Link
                to="/admin/users"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/10 px-4 text-sm font-semibold text-ink"
              >
                <Users className="size-4" aria-hidden="true" />
                {t("admin.overview.toUsers")}
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
          {t("admin.reports.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {t("admin.reports.subtitle")}
        </p>

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

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
          >
            {error}
          </p>
        ) : null}

        {isAdmin ? (
          <div
            className="mt-6 flex flex-wrap gap-2"
            role="group"
            aria-label={t("admin.reports.range")}
          >
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold ${
                  range === value
                    ? "bg-burgundy text-cream"
                    : "bg-burgundy/10 text-burgundy hover:bg-burgundy/15"
                }`}
              >
                {t(`admin.reports.range.${value}`)}
              </button>
            ))}
          </div>
        ) : null}

        {isAdmin && loading ? (
          <p
            className="mt-8 inline-flex items-center gap-2 text-ink-soft"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t("admin.reports.loading")}
          </p>
        ) : null}

        {isAdmin && data ? (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  ["requests", data.totals.requests],
                  ["errors", data.totals.errors],
                  ["uniqueIps", data.totals.uniqueIps],
                  ["countryViews", data.totals.countryViews],
                  ["restaurantSearches", data.totals.restaurantSearches],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
                    {t(`admin.reports.metric.${key}`)}
                  </p>
                  <p className="mt-1 font-display text-3xl text-burgundy">{value}</p>
                </div>
              ))}
            </div>

            <section className="mt-8 rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-tomato" aria-hidden="true" />
                <h2 className="font-display text-2xl text-burgundy">
                  {t("admin.reports.traffic")}
                </h2>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {t("admin.reports.trafficHint")}
              </p>
              <div className="mt-4">
                <TrafficChart series={data.series} range={data.range} />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-soft">
                <span>
                  2xx: {data.statusBreakdown["2xx"]} · 4xx:{" "}
                  {data.statusBreakdown["4xx"]} · 5xx:{" "}
                  {data.statusBreakdown["5xx"]}
                  {data.statusBreakdown.other > 0
                    ? ` · other: ${data.statusBreakdown.other}`
                    : ""}
                </span>
              </div>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
                <h2 className="font-display text-2xl text-burgundy">
                  {t("admin.reports.topIps")}
                </h2>
                {data.topIps.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    {t("admin.reports.empty")}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[16rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-stamp">
                          <th className="py-2 pr-3 font-semibold">
                            {t("admin.reports.col.ip")}
                          </th>
                          <th className="py-2 pr-3 font-semibold">
                            {t("admin.reports.col.count")}
                          </th>
                          <th className="py-2 font-semibold">
                            {t("admin.reports.col.lastSeen")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topIps.map((row) => (
                          <tr
                            key={row.ip}
                            className="border-b border-ink/5 text-ink"
                          >
                            <td className="py-2 pr-3 font-mono text-xs">
                              {row.ip}
                            </td>
                            <td className="py-2 pr-3">{row.count}</td>
                            <td className="py-2 text-ink-soft">
                              {formatWhen(row.lastSeen)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
                <h2 className="font-display text-2xl text-burgundy">
                  {t("admin.reports.topPaths")}
                </h2>
                {data.topPaths.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    {t("admin.reports.empty")}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[16rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-stamp">
                          <th className="py-2 pr-3 font-semibold">
                            {t("admin.reports.col.path")}
                          </th>
                          <th className="py-2 font-semibold">
                            {t("admin.reports.col.count")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topPaths.map((row) => (
                          <tr
                            key={row.path}
                            className="border-b border-ink/5 text-ink"
                          >
                            <td className="py-2 pr-3 font-mono text-xs">
                              {row.path}
                            </td>
                            <td className="py-2">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <section className="mt-8 rounded-2xl bg-cream p-5 ring-1 ring-ink/10">
              <h2 className="font-display text-2xl text-burgundy">
                {t("admin.reports.product")}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {t("admin.reports.productHint")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["country_view", "countryViews"],
                    ["restaurant_search", "restaurantSearches"],
                    ["suggestion_preview", "suggestionPreviews"],
                    ["suggestion_create", "suggestionCreates"],
                    ["auth_login_success", "loginSuccess"],
                    ["auth_login_failure", "loginFailure"],
                    ["restaurant_view", "restaurantViews"],
                  ] as const
                ).map(([eventType, labelKey]) => (
                  <div
                    key={eventType}
                    className="rounded-xl bg-parchment/60 px-3 py-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stamp">
                      {t(`admin.reports.product.${labelKey}`)}
                    </p>
                    <p className="mt-1 font-display text-2xl text-burgundy">
                      {productTotals[eventType] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
