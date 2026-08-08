import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  FilePenLine,
  ImagePlus,
  LoaderCircle,
  MoreVertical,
  Star,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useT } from "@/i18n/LocaleContext";

export type AdminItemAction =
  | "remove"
  | "replace-image"
  | "replace-text"
  | "find-menu"
  | "find-scores"
  | "select-for-dinner";

type AdminItemMenuProps = {
  label: string;
  /** Hide replace-image for items without photos (e.g. specialty shops). */
  showReplaceImage?: boolean;
  /** Recipe-only: set this dish as the Dinner course for its category. */
  showSelectForDinner?: boolean;
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

type MenuPosition = {
  top: number;
  left: number;
};

export function AdminItemMenu({
  label,
  showReplaceImage = true,
  showSelectForDinner = false,
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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [statusPosition, setStatusPosition] = useState<MenuPosition | null>(
    null,
  );

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const panelWidth = 288;
    const gap = 8;
    const left = Math.min(
      Math.max(8, rect.right - panelWidth),
      window.innerWidth - panelWidth - 8,
    );
    let top = rect.bottom + gap;
    const panelHeight = panelRef.current?.offsetHeight ?? 280;
    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - panelHeight);
    }
    setPosition({ top, left });
  }

  function updateStatusPosition() {
    const button = buttonRef.current;
    if (!button || (!status && !error)) {
      setStatusPosition(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const toastWidth = 224;
    const left = Math.min(
      Math.max(8, rect.right - toastWidth),
      window.innerWidth - toastWidth - 8,
    );
    setStatusPosition({ top: rect.bottom + 4, left });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open]);

  useLayoutEffect(() => {
    updateStatusPosition();
  }, [status, error]);

  useEffect(() => {
    if (!open && !status && !error) return;
    function onPointer(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      if (open) updatePosition();
      updateStatusPosition();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, status, error]);

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
            className="fixed z-[80] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-xl"
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
                  {t("admin.item.remove.hint")}
                </span>
              </span>
            </button>
            {showReplaceImage ? (
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
            ) : null}
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
            {showSelectForDinner ? (
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
                    {t("admin.item.selectForDinner.hint")}
                  </span>
                </span>
              </button>
            ) : null}
            {showRestaurantResearch ? (
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
            className={`fixed z-[80] max-w-56 rounded-xl px-2 py-1 text-xs shadow-sm ${
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
      className={`z-30 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
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
