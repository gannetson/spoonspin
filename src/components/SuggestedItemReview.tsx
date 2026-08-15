import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthModal } from "@/auth/AuthModalContext";
import { ReviewModal } from "@/components/ReviewModal";
import { useT } from "@/i18n/LocaleContext";
import { useTagsOptional } from "@/tags/TagsContext";
import { removeTagPhoto, uploadTagPhotos, upsertMyTag } from "@/tags/client";
import type { TagEntityType, UserTag } from "@/tags/types";
import { drinkEntityId } from "@/tags/types";
import { zClass } from "@/lib/stacking";

export type SuggestReviewTarget = {
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
};

function ratingBand(rating: number): "low" | "mid" | "high" {
  if (rating <= 1) return "low";
  if (rating <= 3) return "mid";
  return "high";
}

/** Opens the guided review modal after a user confirms a suggestion. */
export function SuggestedItemReview({
  target,
  onClose,
}: {
  target: SuggestReviewTarget | null;
  onClose: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const tagsCtx = useTagsOptional();
  const [rating, setRating] = useState(4);
  const [tag, setTag] = useState<UserTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authAsked, setAuthAsked] = useState(false);

  useEffect(() => {
    if (!target) {
      setTag(null);
      setRating(4);
      setAuthAsked(false);
      return;
    }
    setTag(null);
    setRating(4);
    setAuthAsked(false);
  }, [target]);

  useEffect(() => {
    if (!target || user || authAsked) return;
    setAuthAsked(true);
    openAuth({
      mode: "login",
      onSuccess: () => {
        /* review stays open once signed in */
      },
    });
  }, [target, user, authAsked, openAuth]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!target) {
    return toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null;
  }

  if (!user) {
    return null;
  }

  async function persist(reviewText: string): Promise<UserTag> {
    const saved = tagsCtx
      ? await tagsCtx.saveTag({
          entityType: target!.entityType,
          entityId: target!.entityId,
          entityName: target!.entityName,
          countryCode: target!.countryCode,
          intent: "did",
          rating,
          reviewText,
        })
      : await upsertMyTag({
          entityType: target!.entityType,
          entityId: target!.entityId,
          entityName: target!.entityName,
          countryCode: target!.countryCode,
          intent: "did",
          rating,
          reviewText,
        });
    setTag(saved);
    return saved;
  }

  return (
    <>
      <ReviewModal
        open
        entityType={target.entityType}
        entityName={target.entityName}
        rating={rating}
        onRatingChange={setRating}
        initialReview={tag?.reviewText ?? ""}
        initialPhotos={tag?.photoUrls ?? []}
        tagId={tag?.id ?? null}
        saving={saving}
        onClose={onClose}
        onSave={async (reviewText) => {
          setSaving(true);
          try {
            const saved = await persist(reviewText);
            setToast(
              t(`review.thanks.${target.entityType}.${ratingBand(rating)}`, {
                name: target.entityName,
              }),
            );
            onClose();
            return saved;
          } finally {
            setSaving(false);
          }
        }}
        onUploadPhotos={async (files) => {
          if (!tag?.id) return;
          const saved = tagsCtx
            ? await tagsCtx.addPhotos(tag.id, files)
            : await uploadTagPhotos(tag.id, files);
          setTag(saved);
          return saved;
        }}
        onRemovePhoto={async (url) => {
          if (!tag?.id) return;
          const saved = tagsCtx
            ? await tagsCtx.removePhoto(tag.id, url)
            : await removeTagPhoto(tag.id, url);
          setTag(saved);
          return saved;
        }}
      />
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const t = useT();
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 ${zClass.popover} flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-ink/10 bg-ink px-4 py-3 text-sm text-cream shadow-lg`}
    >
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1 text-cream/70 hover:bg-cream/10 hover:text-cream"
        aria-label={t("review.toast.dismissAria")}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function reviewTargetFromSuggestion(input: {
  kind: "recipe" | "drink" | "restaurant" | "shop";
  countryCode: string;
  recipe?: { id: string; name: string };
  drink?: { id?: string; name: string };
  restaurant?: { id: string; name: string };
  shop?: { id: string; name: string };
}): SuggestReviewTarget | null {
  if (input.kind === "recipe" && input.recipe) {
    return {
      entityType: "recipe",
      entityId: input.recipe.id,
      entityName: input.recipe.name,
      countryCode: input.countryCode,
    };
  }
  if (input.kind === "drink" && input.drink) {
    return {
      entityType: "drink",
      entityId: drinkEntityId(input.drink),
      entityName: input.drink.name,
      countryCode: input.countryCode,
    };
  }
  if (input.kind === "restaurant" && input.restaurant) {
    return {
      entityType: "restaurant",
      entityId: input.restaurant.id,
      entityName: input.restaurant.name,
      countryCode: input.countryCode,
    };
  }
  if (input.kind === "shop" && input.shop) {
    return {
      entityType: "shop",
      entityId: input.shop.id,
      entityName: input.shop.name,
      countryCode: input.countryCode,
    };
  }
  return null;
}
