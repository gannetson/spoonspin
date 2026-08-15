import { useId } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  FilePenLine,
  ImagePlus,
  Images,
  LoaderCircle,
  MoreVertical,
  Star,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { useAnchoredToast, usePortalMenu } from "@/lib/usePortalMenu";

export type AdminItemAction =
  | "remove"
  | "replace-image"
  | "select-image"
  | "edit-text"
  | "replace-text"
  | "find-menu"
  | "find-scores"
  | "select-for-dinner";

type AdminItemMenuProps = {
  label: string;
  /** Hide replace-image for items without photos (e.g. specialty shops). */
  showReplaceImage?: boolean;
  showReplaceText?: boolean;
  /** Manual sectioned recipe / restaurant copy editor. */
  showEditText?: boolean;
  editTextLabelKey?: string;
  editTextHintKey?: string;
  /** Recipe/drink: add to the Dinner tab composition. */
  showSelectForDinner?: boolean;
  /** Only show the remove action (e.g. dinner membership). */
  removeOnly?: boolean;
  removeHintKey?: string;
  selectForDinnerHintKey?: string;
  /** Restaurant-only enrichment actions. */
  showRestaurantResearch?: boolean;
  replaceImageHintKey?: string;
  busy?: boolean;
  status?: string | null;
  error?: string | null;
  onAction: (action: AdminItemAction) => void;
  className?: string;
  tone?: "light" | "dark";
};

export function AdminItemMenu({
  label,
  showReplaceImage = true,
  showReplaceText = true,
  showEditText = false,
  editTextLabelKey = "admin.item.editRecipe",
  editTextHintKey = "admin.item.editRecipe.hint",
  showSelectForDinner = false,
  removeOnly = false,
  removeHintKey = "admin.item.remove.hint",
  selectForDinnerHintKey = "admin.item.selectForDinner.hint",
  showRestaurantResearch = false,
  replaceImageHintKey = "admin.item.replaceImage.hint",
  busy = false,
  status = null,
  error = null,
  onAction,
  className = "",
  tone = "light",
}: AdminItemMenuProps) {
  const t = useT();
  const menuId = useId();
  const { open, setOpen, rootRef, triggerRef, panelRef, position } = usePortalMenu({
    estimatedHeight: 280,
  });
  const { position: statusPosition } = useAnchoredToast({
    active: Boolean(status || error),
    triggerRef,
    width: 224,
  });

  function run(action: AdminItemAction) {
    setOpen(false);
    onAction(action);
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className={`fixed ${zClass.popover} w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-xl`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => run("remove")}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
            >
              <Trash2 className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.item.remove")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t(removeHintKey)}
                </span>
              </span>
            </button>
            {!removeOnly && showReplaceImage ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run("replace-image")}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
                >
                  <ImagePlus className="mt-0.5 size-4 shrink-0 text-tomato" />
                  <span>
                    <span className="block font-semibold text-ink">
                      {t("admin.item.replaceImage")}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {t(
                        showRestaurantResearch
                          ? "admin.item.replaceImage.restaurant.hint"
                          : replaceImageHintKey,
                      )}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run("select-image")}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
                >
                  <Images className="mt-0.5 size-4 shrink-0 text-tomato" />
                  <span>
                    <span className="block font-semibold text-ink">
                      {t("admin.item.selectImage")}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {t("admin.item.selectImage.hint")}
                    </span>
                  </span>
                </button>
              </>
            ) : null}
            {!removeOnly && showEditText ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => run("edit-text")}
                className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
              >
                <FilePenLine className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t(editTextLabelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t(editTextHintKey)}
                  </span>
                </span>
              </button>
            ) : null}
            {!removeOnly && showReplaceText ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => run("replace-text")}
                className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
              >
                <FilePenLine className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t("admin.item.replaceText")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t("admin.item.replaceText.hint")}
                  </span>
                </span>
              </button>
            ) : null}
            {!removeOnly && showSelectForDinner ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => run("select-for-dinner")}
                className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
              >
                <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-tomato" />
                <span>
                  <span className="block font-semibold text-ink">
                    {t("admin.item.selectForDinner")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {t(selectForDinnerHintKey)}
                  </span>
                </span>
              </button>
            ) : null}
            {!removeOnly && showRestaurantResearch ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run("find-menu")}
                  className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
                >
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-tomato" />
                  <span>
                    <span className="block font-semibold text-ink">
                      {t("admin.item.findMenu")}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {t("admin.item.findMenu.hint")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run("find-scores")}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
                >
                  <Star className="mt-0.5 size-4 shrink-0 text-tomato" />
                  <span>
                    <span className="block font-semibold text-ink">
                      {t("admin.item.findScores")}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {t("admin.item.findScores.hint")}
                    </span>
                  </span>
                </button>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  const statusToast =
    (status || error) && statusPosition
      ? createPortal(
          <p
            role={error ? "alert" : "status"}
            style={{ top: statusPosition.top, left: statusPosition.left }}
            className={`fixed ${zClass.popover} max-w-56 rounded-xl px-2 py-1 text-xs shadow-sm ${
              error ? "bg-cream text-tomato" : "bg-cream text-ink-soft"
            }`}
          >
            {error ?? status}
          </p>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={className}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("admin.item.menuAria", { label })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex size-10 items-center justify-center rounded-full shadow-sm disabled:opacity-60 ${
          tone === "dark"
            ? "bg-cream/20 text-cream backdrop-blur-sm hover:bg-cream/30"
            : "bg-cream/95 text-ink ring-1 ring-ink/10 hover:bg-cream"
        }`}
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <MoreVertical className="size-4" aria-hidden="true" />
        )}
      </button>

      {menu}
      {statusToast}
    </div>
  );
}
