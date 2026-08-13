import { useEffect, useState } from "react";
import { Bookmark, Check, MessageSquareText, Star, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import { ReviewModal } from "@/components/ReviewModal";
import { useT } from "@/i18n/LocaleContext";
import { useTagsOptional } from "@/tags/TagsContext";
import {
  deleteMyTag,
  upsertMyTag,
  uploadTagPhotos,
  removeTagPhoto,
} from "@/tags/client";
import type { TagEntityType, TagIntent, UserTag } from "@/tags/types";

type ItemTagBarProps = {
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  /** Compact strip for cards. */
  variant?: "full" | "compact";
  className?: string;
};

function ratingBand(rating: number): "low" | "mid" | "high" {
  if (rating <= 1) return "low";
  if (rating <= 3) return "mid";
  return "high";
}

export function ItemTagBar({
  entityType,
  entityId,
  entityName,
  countryCode,
  variant = "full",
  className = "",
}: ItemTagBarProps) {
  const t = useT();
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const tagsCtx = useTagsOptional();
  const [localTag, setLocalTag] = useState<UserTag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fromCtx = tagsCtx?.tagFor(entityType, entityId, countryCode);
  const tag = fromCtx ?? localTag;

  const wantLabel = t(`tag.want.${entityType}`);
  const didLabel = t(`tag.did.${entityType}`);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function persist(next: {
    intent: TagIntent;
    rating?: number | null;
    reviewText?: string | null;
  }): Promise<UserTag> {
    setBusy(true);
    setError(null);
    try {
      const saved = tagsCtx
        ? await tagsCtx.saveTag({
            entityType,
            entityId,
            entityName,
            countryCode,
            ...next,
          })
        : await upsertMyTag({
            entityType,
            entityId,
            entityName,
            countryCode,
            ...next,
          });
      setLocalTag(saved);
      return saved;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("tag.error.save");
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function setIntent(intent: TagIntent) {
    if (tag?.intent === intent) {
      if (!tag) return;
      setBusy(true);
      setError(null);
      try {
        if (tagsCtx) await tagsCtx.removeTag(tag.id);
        else await deleteMyTag(tag.id);
        setLocalTag(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("tag.error.save"));
      } finally {
        setBusy(false);
      }
      return;
    }
    await persist({
      intent,
      rating: intent === "want" ? null : (tag?.rating ?? null),
    });
  }

  async function setRating(rating: number) {
    const next = await persist({
      intent: "did",
      rating,
    });
    if (!tag?.reviewText && !reviewOpen) {
      setReviewOpen(true);
    }
    return next;
  }

  function thankYouMessage(rating: number): string {
    const band = ratingBand(rating);
    return t(`review.thanks.${entityType}.${band}`, { name: entityName });
  }

  if (!user) {
    return (
      <div className={`print:hidden ${className}`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openAuth({ mode: "login" });
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-tomato underline-offset-2 hover:underline"
        >
          {t("tag.signIn")}
        </button>
      </div>
    );
  }

  const starRow = (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={t("tag.ratingAria")}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={busy}
        aria-label={t("tag.starAria", { rating: 0 })}
        aria-pressed={tag?.rating === 0}
        onClick={() => void setRating(0)}
        className={`mr-0.5 rounded px-1 py-0.5 text-[0.65rem] font-bold transition ${
          tag?.rating === 0
            ? "bg-burgundy text-cream"
            : "text-burgundy/40 hover:bg-parchment hover:text-burgundy"
        }`}
      >
        0
      </button>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = (tag?.rating ?? -1) >= value;
        return (
          <button
            key={value}
            type="button"
            disabled={busy}
            aria-label={t("tag.starAria", { rating: value })}
            aria-pressed={filled}
            onClick={() => void setRating(value)}
            className={`rounded p-0.5 transition ${
              filled ? "text-saffron" : "text-ink/25 hover:text-saffron/70"
            }`}
          >
            <Star
              className={`size-4 sm:size-5 ${filled ? "fill-current" : ""}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`print:hidden ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={`flex flex-wrap items-center gap-2 ${
          variant === "compact" ? "" : "gap-y-2"
        }`}
      >
        <button
          type="button"
          disabled={busy}
          aria-pressed={tag?.intent === "want"}
          onClick={() => void setIntent("want")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
            tag?.intent === "want"
              ? "bg-stamp text-cream"
              : "bg-parchment text-burgundy hover:bg-stamp/15"
          }`}
        >
          <Bookmark className="size-3.5" aria-hidden="true" />
          {wantLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={tag?.intent === "did"}
          onClick={() => void setIntent("did")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
            tag?.intent === "did"
              ? "bg-tomato text-cream"
              : "bg-parchment text-burgundy hover:bg-tomato/15"
          }`}
        >
          <Check className="size-3.5" aria-hidden="true" />
          {didLabel}
        </button>

        {tag?.intent === "did" || variant === "full" ? starRow : null}

        {tag?.intent === "did" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setReviewOpen(true)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-stamp hover:bg-parchment sm:text-sm"
          >
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            {tag.reviewText ? t("tag.editReview") : t("tag.writeReview")}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1 text-xs font-semibold text-tomato" role="alert">
          {error}
        </p>
      ) : null}

      <ReviewModal
        open={reviewOpen}
        entityType={entityType}
        entityName={entityName}
        rating={tag?.rating ?? 0}
        initialReview={tag?.reviewText ?? ""}
        initialPhotos={tag?.photoUrls ?? []}
        tagId={tag?.id ?? null}
        saving={savingReview}
        onClose={() => setReviewOpen(false)}
        onSave={async (reviewText) => {
          setSavingReview(true);
          try {
            const saved = await persist({
              intent: "did",
              rating: tag?.rating ?? 0,
              reviewText,
            });
            setReviewOpen(false);
            setToast(thankYouMessage(saved.rating ?? tag?.rating ?? 0));
            return saved;
          } finally {
            setSavingReview(false);
          }
        }}
        onUploadPhotos={async (files) => {
          if (!tag?.id) return;
          const saved = tagsCtx
            ? await tagsCtx.addPhotos(tag.id, files)
            : await uploadTagPhotos(tag.id, files);
          setLocalTag(saved);
          return saved;
        }}
        onRemovePhoto={async (url) => {
          if (!tag?.id) return;
          const saved = tagsCtx
            ? await tagsCtx.removePhoto(tag.id, url)
            : await removeTagPhoto(tag.id, url);
          setLocalTag(saved);
          return saved;
        }}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[60] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-ink/10 bg-ink px-4 py-3 text-sm text-cream shadow-lg"
        >
          <p className="min-w-0 flex-1 leading-snug">{toast}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 rounded-full p-1 text-cream/70 hover:bg-cream/10 hover:text-cream"
            aria-label={t("review.toast.dismissAria")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
