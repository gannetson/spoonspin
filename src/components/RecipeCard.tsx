import { Clock3, Flame } from "lucide-react";
import type { Recipe, RecipeCategory } from "@/types/content";
import { AdminItemMenu, type AdminItemAction } from "@/components/AdminItemMenu";
import { ItemTagBar } from "@/components/ItemTagBar";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { useT } from "@/i18n/LocaleContext";
import { recipeDisplayName } from "@/lib/recipeDisplay";

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
  const display = recipeDisplayName(recipe);
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
            ? "bg-ochre-soft text-ink ring-2 ring-saffron/55 shadow-sm shadow-saffron/20"
            : "bg-cream text-ink ring-1 ring-ink/10 hover:ring-tomato/35"
        }`}
      >
        <div className="relative flex cursor-pointer">
          <button
            type="button"
            onClick={onOpen}
            className="grid min-w-0 flex-1 cursor-pointer grid-cols-[7rem_minmax(0,1fr)] text-left sm:min-h-[7.5rem] sm:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <div className="relative h-28 w-full self-stretch sm:h-auto sm:row-span-2">
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
              className={`flex min-w-0 flex-col justify-center gap-1.5 px-4 pt-3 sm:gap-2 sm:px-5 sm:pb-1 ${
                isAdmin ? "pr-14" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                    isHighlighted ? "bg-saffron/15 text-stamp" : "bg-parchment text-stamp"
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
                <p className="font-display text-xl leading-tight text-burgundy sm:truncate sm:text-2xl">
                  {display.title}
                </p>
                {display.subtitle ? (
                  <p className="mt-0.5 truncate text-sm text-ink-soft">
                    {display.subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="col-span-2 flex min-w-0 flex-col justify-center gap-1.5 px-4 pb-3 pt-1.5 sm:col-span-1 sm:col-start-2 sm:gap-2 sm:px-5 sm:pt-0"
            >
              {recipe.description.trim() ? (
                <p className="line-clamp-2 text-sm leading-snug text-ink-soft">
                  {recipe.description.trim()}
                </p>
              ) : null}

              {showMeta && !isSimple ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {t("cook.meta.minutes", {
                      minutes: recipe.prepMinutes + recipe.cookMinutes,
                    })}
                  </span>
                  {recipe.waitTime?.trim() ? (
                    <span className="inline-flex items-center gap-1">
                      {t("cook.meta.wait", { wait: recipe.waitTime.trim() })}
                    </span>
                  ) : null}
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
              label={display.title}
              tone="light"
              showSelectForDinner
              showEditText={showEditText}
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
