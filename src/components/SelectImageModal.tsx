import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Search, Upload, X } from "lucide-react";
import {
  searchAdminImages,
  setAdminImage,
  uploadAdminImage,
  type AdminImageSearchResult,
  type AdminImageTarget,
} from "@/admin/countryTools";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

export type SelectImageModalProps = {
  open: boolean;
  label: string;
  defaultQuery: string;
  target: AdminImageTarget;
  onClose: () => void;
  onApplied: (result: {
    country?: import("@/types/content").Country;
    recipe?: import("@/types/content").Recipe | null;
    drink?: import("@/types/content").Drink;
    restaurant?: import("@/restaurants/types").Restaurant;
    imageUrl: string;
    imageAttribution?: string | null;
  }) => void;
};

const PAGE_SIZE = 12;

export function SelectImageModal({
  open,
  label,
  defaultQuery,
  target,
  onClose,
  onApplied,
}: SelectImageModalProps) {
  const t = useT();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<AdminImageSearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [totalHits, setTotalHits] = useState<number | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const restaurantId = target.kind === "restaurant" ? target.restaurantId : undefined;

  useEffect(() => {
    if (!open) return;
    setQuery(defaultQuery);
    setResults([]);
    setOffset(0);
    setNextOffset(null);
    setTotalHits(null);
    setError(null);
    setSearched(false);
    setApplyBusy(false);
    const q = defaultQuery.trim();
    if (!q && !restaurantId) return;
    let cancelled = false;
    setSearchBusy(true);
    void searchAdminImages({
      q,
      offset: 0,
      limit: PAGE_SIZE,
      restaurantId,
    })
      .then((page) => {
        if (cancelled) return;
        setResults(page.results);
        setOffset(page.offset);
        setNextOffset(page.nextOffset);
        setTotalHits(page.totalHits);
        setSearched(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("admin.selectImage.searchError"));
        setSearched(true);
      })
      .finally(() => {
        if (!cancelled) setSearchBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, defaultQuery, restaurantId, t]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !applyBusy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, applyBusy, onClose]);

  async function runSearch(nextOffsetValue = 0) {
    const q = query.trim();
    if (!q && !restaurantId) {
      setError(t("admin.selectImage.searchRequired"));
      return;
    }
    setSearchBusy(true);
    setError(null);
    try {
      const page = await searchAdminImages({
        q,
        offset: nextOffsetValue,
        limit: PAGE_SIZE,
        restaurantId,
      });
      setResults(page.results);
      setOffset(page.offset);
      setNextOffset(page.nextOffset);
      setTotalHits(page.totalHits);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.selectImage.searchError"));
    } finally {
      setSearchBusy(false);
    }
  }

  async function applyFromUrl(imageUrl: string, imageAttribution?: string) {
    setApplyBusy(true);
    setError(null);
    try {
      const result = await setAdminImage({
        target,
        imageUrl,
        imageAttribution: imageAttribution ?? null,
      });
      onApplied(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.selectImage.applyError"));
    } finally {
      setApplyBusy(false);
    }
  }

  async function onUploadFile(file: File | undefined) {
    if (!file) return;
    setApplyBusy(true);
    setError(null);
    try {
      const result = await uploadAdminImage({ target, file });
      onApplied(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.selectImage.uploadError"));
    } finally {
      setApplyBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!open) return null;

  const busy = searchBusy || applyBusy;
  const canPrev = offset > 0 && !busy;
  const canNext = nextOffset != null && !busy;

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-4 sm:items-center`}
      onClick={() => {
        if (!applyBusy) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-cream shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("admin.selectImage.eyebrow")}
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-burgundy">
              {t("admin.selectImage.title", { label })}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t("admin.selectImage.subtitle")}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("admin.selectImage.close")}
            disabled={applyBusy}
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">
              {t("admin.selectImage.searchHeading")}
            </h3>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch(0);
              }}
            >
              <label className="sr-only" htmlFor={`${titleId}-q`}>
                {t("admin.selectImage.searchLabel")}
              </label>
              <input
                id={`${titleId}-q`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={busy}
                className="min-h-11 flex-1 rounded-xl border border-ink/15 bg-white px-3 text-ink outline-none focus:border-tomato"
                placeholder={t("admin.selectImage.searchPlaceholder")}
              />
              <button
                type="submit"
                disabled={busy || !query.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-cream disabled:opacity-50"
              >
                {searchBusy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" aria-hidden="true" />
                )}
                {t("admin.selectImage.search")}
              </button>
            </form>

            {searched ? (
              <div className="space-y-3">
                {results.length === 0 && !searchBusy ? (
                  <p className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink-soft">
                    {t("admin.selectImage.empty")}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {results.map((item) => (
                      <li key={item.url}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void applyFromUrl(item.url, item.attribution)}
                          className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-parchment ring-1 ring-ink/10 disabled:opacity-60"
                        >
                          <img
                            src={item.url}
                            alt=""
                            className="size-full object-cover transition group-hover:scale-[1.03]"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1.5 text-left text-[11px] leading-snug text-cream opacity-0 transition group-hover:opacity-100">
                            {item.attribution}
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition group-hover:bg-ink/25 group-hover:opacity-100">
                            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink">
                              <ImagePlus className="size-3.5" />
                              {t("admin.selectImage.use")}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-soft">
                    {totalHits != null
                      ? t("admin.selectImage.pageInfo", {
                          from: String(offset + 1),
                          to: String(offset + results.length),
                          total: String(totalHits),
                        })
                      : null}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canPrev}
                      onClick={() => void runSearch(Math.max(0, offset - PAGE_SIZE))}
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
                    >
                      {t("admin.selectImage.prev")}
                    </button>
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={() => void runSearch(nextOffset ?? offset)}
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
                    >
                      {t("admin.selectImage.next")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 border-t border-ink/10 pt-5">
            <h3 className="text-sm font-semibold text-ink">
              {t("admin.selectImage.uploadHeading")}
            </h3>
            <p className="text-sm text-ink-soft">{t("admin.selectImage.uploadHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void onUploadFile(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-ink/25 bg-white px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato disabled:opacity-50"
            >
              {applyBusy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {t("admin.selectImage.upload")}
            </button>
          </section>

          {error ? (
            <p role="alert" className="text-sm text-tomato">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
