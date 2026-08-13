import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Camera, LoaderCircle, Star, X } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import type { TagEntityType, UserTag } from "@/tags/types";

type ReviewModalProps = {
  open: boolean;
  entityType: TagEntityType;
  entityName: string;
  rating: number;
  initialReview: string;
  initialPhotos: string[];
  tagId: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (reviewText: string) => Promise<UserTag>;
  onUploadPhotos: (files: File[]) => Promise<UserTag | void>;
  onRemovePhoto: (url: string) => Promise<UserTag | void>;
  /** When set, show an interactive star row in the modal. */
  onRatingChange?: (rating: number) => void;
};

function promptBand(rating: number): "low" | "mid" | "high" {
  if (rating <= 1) return "low";
  if (rating <= 3) return "mid";
  return "high";
}

export function ReviewModal({
  open,
  entityType,
  entityName,
  rating,
  initialReview,
  initialPhotos,
  tagId,
  saving,
  onClose,
  onSave,
  onUploadPhotos,
  onRemovePhoto,
  onRatingChange,
}: ReviewModalProps) {
  const t = useT();
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialReview);
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const band = promptBand(rating);
  const chips = useMemo(() => {
    const keys = [
      `review.chip.${entityType}.${band}.1`,
      `review.chip.${entityType}.${band}.2`,
      `review.chip.${entityType}.${band}.3`,
    ] as const;
    return keys.map((key) => t(key));
  }, [entityType, band, t]);

  const guide = t(`review.guide.${entityType}.${band}`);

  useEffect(() => {
    if (!open) return;
    setText(initialReview);
    setPhotos(initialPhotos);
    setError(null);
    setUploading(false);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, initialReview, initialPhotos]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function appendChip(chip: string) {
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.endsWith(chip)) return trimmed;
      const spacer = /[.!?]$/.test(trimmed) ? " " : ". ";
      return `${trimmed}${spacer}${chip}`;
    });
  }

  async function handleSave() {
    setError(null);
    try {
      const tag = await onSave(text.trim());
      setPhotos(tag.photoUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("review.error.save"));
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || !tagId) {
      setError(t("review.error.saveFirst"));
      return;
    }
    const files = Array.from(fileList).slice(0, 5);
    setUploading(true);
    setError(null);
    try {
      const updated = await onUploadPhotos(files);
      if (updated?.photoUrls) setPhotos(updated.photoUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("review.error.upload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("review.kicker")}
            </p>
            <h2
              id={titleId}
              className="font-display text-2xl leading-tight text-burgundy"
            >
              {t("review.title", { name: entityName })}
            </h2>
            {onRatingChange ? (
              <div
                className="mt-2 flex items-center gap-0.5"
                role="group"
                aria-label={t("tag.ratingAria")}
              >
                <button
                  type="button"
                  aria-label={t("tag.starAria", { rating: 0 })}
                  aria-pressed={rating === 0}
                  onClick={() => onRatingChange(0)}
                  className={`mr-0.5 rounded px-1 py-0.5 text-[0.65rem] font-bold transition ${
                    rating === 0
                      ? "bg-burgundy text-cream"
                      : "text-burgundy/40 hover:bg-parchment hover:text-burgundy"
                  }`}
                >
                  0
                </button>
                {[1, 2, 3, 4, 5].map((value) => {
                  const filled = rating >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={t("tag.starAria", { rating: value })}
                      aria-pressed={filled}
                      onClick={() => onRatingChange(value)}
                      className={`rounded p-0.5 transition ${
                        filled
                          ? "text-saffron"
                          : "text-ink/25 hover:text-saffron/70"
                      }`}
                    >
                      <Star
                        className={`size-5 ${filled ? "fill-current" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">
                {t("review.starsLabel", { rating })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink"
            aria-label={t("review.closeAria")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <p className="rounded-2xl bg-parchment/80 px-4 py-3 text-sm leading-relaxed text-ink">
            {guide}
          </p>

          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendChip(chip)}
                className="rounded-full border border-stamp/30 bg-white/60 px-3 py-1.5 text-left text-xs font-semibold text-stamp transition hover:border-tomato/40 hover:text-tomato"
              >
                {chip}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="sr-only">{t("review.textareaLabel")}</span>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              maxLength={4000}
              placeholder={t(`review.placeholder.${entityType}.${band}`)}
              className="w-full resize-y rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink outline-none ring-tomato/30 placeholder:text-ink-soft focus:ring-2"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {t("review.photos")}
              </p>
              <p className="text-xs text-ink-soft">
                {t("review.photosHint", { count: photos.length, max: 5 })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-xl bg-parchment"
                >
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    disabled={!tagId || uploading || saving}
                    onClick={() => {
                      void (async () => {
                        try {
                          const updated = await onRemovePhoto(url);
                          if (updated?.photoUrls) setPhotos(updated.photoUrls);
                          else setPhotos((prev) => prev.filter((p) => p !== url));
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : t("review.error.upload"),
                          );
                        }
                      })();
                    }}
                    className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-cream"
                    aria-label={t("review.removePhotoAria")}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {photos.length < 5 ? (
                <button
                  type="button"
                  disabled={!tagId || uploading || saving}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stamp/40 bg-white/50 text-stamp hover:border-tomato/50 hover:text-tomato disabled:opacity-50"
                >
                  {uploading ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" aria-hidden="true" />
                  )}
                  <span className="text-[0.65rem] font-semibold">
                    {t("review.addPhoto")}
                  </span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            {!tagId ? (
              <p className="mt-2 text-xs text-ink-soft">
                {t("review.photosAfterSave")}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm font-semibold text-tomato" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-ink/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-parchment"
          >
            {t("review.cancel")}
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-full bg-tomato px-5 py-2 text-sm font-semibold text-cream hover:bg-tomato/90 disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {saving ? t("review.saving") : t("review.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
