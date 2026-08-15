import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import {
  fetchAdminFillStatus,
  type AdminFillStatusResponse,
} from "@/admin/fillStatus";
import { useT } from "@/i18n/LocaleContext";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminFillPanel() {
  const t = useT();
  const [data, setData] = useState<AdminFillStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const [restaurantsOpen, setRestaurantsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const status = await fetchAdminFillStatus();
        if (!cancelled) setData(status);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : t("admin.fill.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const ordersByCountry = useMemo(() => {
    if (!data) return [];
    const map = new Map<
      string,
      { name: string; cells: AdminFillStatusResponse["orders"] }
    >();
    for (const row of data.orders) {
      const existing = map.get(row.countryCode);
      if (existing) {
        existing.cells.push(row);
      } else {
        map.set(row.countryCode, { name: row.countryName, cells: [row] });
      }
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [data]);

  if (loading) {
    return (
      <p className="mt-8 inline-flex items-center gap-2 text-ink-soft" role="status">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        {t("admin.fill.loading")}
      </p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="mt-8 rounded-xl border border-tomato/30 bg-cream px-4 py-3 text-tomato"
      >
        {error}
      </p>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <section className="mt-10" aria-labelledby="admin-fill-heading">
      <h2 id="admin-fill-heading" className="font-display text-3xl text-burgundy">
        {t("admin.fill.title")}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t("admin.fill.subtitle")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
            {t("admin.fill.metric.lastRun")}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatWhen(summary.lastRunAt)}
          </p>
        </div>
        <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
            {t("admin.fill.metric.orders")}
          </p>
          <p className="mt-1 font-display text-2xl text-burgundy">
            {summary.orderJobsDone}/{summary.orderJobsTotal}
          </p>
          <p className="text-xs text-ink-soft">
            {t("admin.fill.metric.ordersRemaining", {
              count: summary.orderJobsRemaining,
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
            {t("admin.fill.metric.cook")}
          </p>
          <p className="mt-1 font-display text-2xl text-burgundy">
            {summary.cookIncomplete}
          </p>
          <p className="text-xs text-ink-soft">{t("admin.fill.metric.cookHint")}</p>
        </div>
        <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
            {t("admin.fill.metric.restaurants")}
          </p>
          <p className="mt-1 font-display text-2xl text-burgundy">
            {summary.restaurantGaps}
          </p>
          <p className="text-xs text-ink-soft">
            {t("admin.fill.metric.enrichment", {
              restaurants: summary.pendingRestaurantEnrichment,
              orders: summary.pendingOrderEnrichment,
            })}
          </p>
        </div>
      </div>

      {data.failedOrderJobs.length > 0 ? (
        <div className="mt-4 rounded-xl border border-tomato/25 bg-cream px-4 py-3 text-sm">
          <p className="font-semibold text-tomato">{t("admin.fill.failedTitle")}</p>
          <ul className="mt-2 list-inside list-disc text-ink-soft">
            {data.failedOrderJobs.slice(0, 12).map((id) => (
              <li key={id} className="font-mono text-xs">
                {id}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">{data.retryHint}</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-soft">{data.retryHint}</p>
      )}

      <div className="mt-4 space-y-2">
        <details
          className="rounded-2xl bg-cream ring-1 ring-ink/10"
          open={ordersOpen}
          onToggle={(e) => setOrdersOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-ink">
            <span>
              {t("admin.fill.section.orders")} ({summary.orderJobsDone}/
              {summary.orderJobsTotal})
            </span>
            <ChevronDown
              className={`size-4 shrink-0 transition ${ordersOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </summary>
          <div className="max-h-80 overflow-auto border-t border-ink/10 px-4 py-3 text-sm">
            {ordersByCountry.slice(0, 40).map(([code, group]) => (
              <div key={code} className="mb-3">
                <p className="font-semibold text-ink">
                  {group.name}{" "}
                  <span className="font-normal text-ink-soft">{code.toUpperCase()}</span>
                </p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {group.cells.map((cell) => (
                    <li
                      key={cell.jobId}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cell.status === "done"
                          ? "bg-ink/10 text-ink"
                          : cell.status === "failed"
                            ? "bg-tomato/15 text-tomato"
                            : "bg-stamp/15 text-stamp"
                      }`}
                    >
                      {cell.city}: {t(`admin.fill.status.${cell.status}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {ordersByCountry.length > 40 ? (
              <p className="text-xs text-ink-soft">{t("admin.fill.truncated")}</p>
            ) : null}
          </div>
        </details>

        <details
          className="rounded-2xl bg-cream ring-1 ring-ink/10"
          open={cookOpen}
          onToggle={(e) => setCookOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-ink">
            <span>
              {t("admin.fill.section.cook")} ({summary.cookIncomplete})
            </span>
            <ChevronDown
              className={`size-4 shrink-0 transition ${cookOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </summary>
          <ul className="max-h-60 overflow-auto border-t border-ink/10 px-4 py-3 text-sm">
            {data.cookIncomplete.length === 0 ? (
              <li className="text-ink-soft">{t("admin.fill.cookEmpty")}</li>
            ) : (
              data.cookIncomplete.slice(0, 40).map((row) => (
                <li key={row.code} className="py-0.5 text-ink">
                  {row.name}{" "}
                  <span className="text-ink-soft">
                    {row.code.toUpperCase()} · {row.recipeCount} recipes
                  </span>
                </li>
              ))
            )}
          </ul>
        </details>

        <details
          className="rounded-2xl bg-cream ring-1 ring-ink/10"
          open={restaurantsOpen}
          onToggle={(e) =>
            setRestaurantsOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-ink">
            <span>
              {t("admin.fill.section.restaurants")} ({summary.restaurantGaps})
              {data.gather.expectedJobs != null
                ? ` · gather ${data.gather.completedJobIds}/${data.gather.expectedJobs}`
                : null}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 transition ${restaurantsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </summary>
          <ul className="max-h-60 overflow-auto border-t border-ink/10 px-4 py-3 text-sm">
            {data.restaurantGaps.length === 0 ? (
              <li className="text-ink-soft">{t("admin.fill.restaurantsEmpty")}</li>
            ) : (
              data.restaurantGaps.slice(0, 40).map((row) => (
                <li key={row.code} className="py-0.5 text-ink">
                  {row.name}{" "}
                  <span className="text-ink-soft">
                    {row.code.toUpperCase()} · {row.reviewedCount}
                  </span>
                </li>
              ))
            )}
          </ul>
        </details>
      </div>
    </section>
  );
}
