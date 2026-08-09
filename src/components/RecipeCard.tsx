import { Clock3, Flame } from "lucide-react";
import type { Recipe, RecipeCategory } from "@/types/content";
import { AdminItemMenu, type AdminItemAction } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { useT } from "@/i18n/LocaleContext";

const COURSE_KEYS: Record<RecipeCategory, string> = {
  starter: "cook.course.starter",
  main: "cook.course.main",
  side: "cook.course.side",
  dessert: "cook.course.dessert",
  snack: "cook.course.snack",
};

const DIFFICULTY_KEYS = {
  easy: "recipe.difficulty.easy",
  medium: "recipe.difficulty.medium",
  challenging: "recipe.difficulty.challenging",
} as const;

type RecipeCardProps = {
  recipe: Recipe;
  countryCode: string;
  onOpen: () => void;
  variant?: "default" | "national" | "community" | "simple" | "dinner";
  showMeta?: boolean;
  isAdmin?: boolean;
  showEditText?: boolean;
  adminBusy?: boolean;
  adminStatus?: string | null;
  adminError?: string | null;
  onAdminAction?: (action: AdminItemAction) => void;
};

export function RecipeCard({
  recipe,
  countryCode,
  onOpen,
  variant = "default",
  showMeta = true,
  isAdmin = false,
  showEditText = false,
  adminBusy = false,
  adminStatus = null,
  adminError = null,
  onAdminAction,
}: RecipeCardProps) {
  const t = useT();
  const isNational = variant === "national";
  const isDinner = variant === "dinner";
  const isHighlighted = isNational || isDinner;
  const isCommunity = variant === "community";
  const isSimple = variant === "simple";
  const imageUrl = recipe.imageUrl?.trim() || null;

  return (
    <li>
      <div
        className={`group relative overflow-hidden rounded-2xl transition ${
          isHighlighted
            ? "bg-ochre text-ink ring-2 ring-saffron/55 shadow-sm shadow-saffron/20"
            : "bg-cream text-ink ring-1 ring-ink/10 hover:ring-tomato/35"
        }`}
      >
        <div className="relative flex cursor-pointer">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 cursor-pointer text-left"
          >
            <div className="relative h-28 w-28 shrink-0 self-stretch sm:h-auto sm:min-h-[7.5rem] sm:w-36">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <MediaPlaceholder
                  labelKey="media.placeholder.recipe"
                  tone="light"
                  compact
                  className="absolute inset-0"
                />
              )}
            </div>

            <div
              className={`flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3 sm:gap-2 sm:px-5 ${
                isAdmin ? "pr-14" : ""
              }`}
            >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                  isHighlighted
                    ? "bg-saffron/15 text-stamp"
                    : "bg-parchment text-stamp"
                }`}
              >
                {isCommunity && isSimple
                  ? t("cook.communitySuggestion")
                  : t(COURSE_KEYS[recipe.category])}
              </span>
              {isDinner ? (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stamp">
                  {t("cook.badge.dinner")}
                </span>
              ) : null}
              {isNational && !isDinner ? (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stamp">
                  {t("cook.badge.iconicNationalDish")}
                </span>
              ) : null}
              {isCommunity && !isSimple ? (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stamp">
                  {t("cook.badge.community")}
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate font-display text-xl leading-tight sm:text-2xl">
                {recipe.name}
              </p>
              {recipe.localName ? (
                <p className="mt-0.5 truncate text-sm text-ink-soft">
                  {recipe.localName}
                </p>
              ) : null}
              {recipe.description.trim() ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-soft">
                  {recipe.description.trim()}
                </p>
              ) : null}
            </div>

            {showMeta && !isSimple ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {t("cook.meta.minutes", {
                    minutes: recipe.prepMinutes + recipe.cookMinutes,
                  })}
                </span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <Flame aria-hidden="true" className="size-3.5" />
                  {t(DIFFICULTY_KEYS[recipe.difficulty])}
                </span>
                {recipe.dietaryLabels.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-parchment px-2 py-0.5 text-xs text-ink-soft"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </button>

          {isAdmin && onAdminAction ? (
            <AdminItemMenu
              className="absolute right-2 top-2"
              label={recipe.name}
              tone="light"
              showSelectForDinner
              showEditText={showEditText}
              replaceImageHintKey="admin.item.replaceImage.dish.hint"
              busy={adminBusy}
              status={adminStatus}
              error={adminError}
              onAction={onAdminAction}
            />
          ) : null}
        </div>
        <div className="border-t border-ink/10 px-4 py-2.5">
          <ItemTagBar
            entityType="recipe"
            entityId={recipe.id}
            entityName={recipe.name}
            countryCode={countryCode}
            variant="compact"
          />
        </div>
      </div>
    </li>
  );
}
