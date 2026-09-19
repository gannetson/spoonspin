import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import { formatAdminErrorMessage } from "@/admin/formatAdminError";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { useAnchoredToast } from "@/lib/usePortalMenu";

const TOAST_WIDTH = 288;

type AdminStatusToastProps = {
  triggerRef: RefObject<HTMLElement | null>;
  busy?: boolean;
  busyLabel?: string;
  status?: string | null;
  error?: string | null;
};

/** Anchored status/error toast for admin menus. Errors are humanized and dismissible. */
export function AdminStatusToast({
  triggerRef,
  busy = false,
  busyLabel,
  status = null,
  error = null,
}: AdminStatusToastProps) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const displayError = error ? formatAdminErrorMessage(error, t) : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [error, status]);

  const showBusy = Boolean(busy && busyLabel);
  const showMessage = !dismissed && Boolean(displayError || status);
  const active = showBusy || showMessage;
  const { position, updatePosition } = useAnchoredToast({
    active,
    width: TOAST_WIDTH,
    triggerRef,
    panelRef,
  });

  useLayoutEffect(() => {
    if (active) updatePosition();
  }, [active, displayError, status, busyLabel, updatePosition]);

  if (!active || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      role={displayError ? "alert" : "status"}
      style={{
        top: position.top,
        left: position.left,
        width: `min(${TOAST_WIDTH}px, calc(100vw - 1rem))`,
      }}
      className={`fixed ${zClass.popover} max-h-48 overflow-y-auto overflow-x-hidden rounded-2xl border border-ink/10 bg-cream px-3 py-2 text-sm shadow-md`}
    >
      {showBusy ? (
        <span className="inline-flex items-center gap-2 text-ink-soft">
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          {busyLabel}
        </span>
      ) : (
        <div className="flex items-start gap-2">
          <p
            className={`min-w-0 flex-1 break-words leading-snug ${
              displayError ? "text-tomato" : "text-ink-soft"
            }`}
          >
            {displayError ?? status}
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-full p-0.5 text-ink-soft/70 hover:bg-ink/5 hover:text-ink"
            aria-label={t("admin.error.dismissAria")}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
