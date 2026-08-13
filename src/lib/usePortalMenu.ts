import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type PortalMenuPosition = {
  top: number;
  left: number;
};

type UsePortalMenuOptions = {
  /** Fixed panel width used for horizontal clamping (px). */
  panelWidth?: number;
  /** Fallback height before the panel mounts (px). */
  estimatedHeight?: number;
  /** Extra gap between trigger and panel (px). */
  gap?: number;
};

/**
 * Positions a fixed, body-portaled menu under a trigger and handles dismiss /
 * reposition. Pair with `createPortal(..., document.body)` and {@link zClass.popover}.
 */
export function usePortalMenu({
  panelWidth = 288,
  estimatedHeight = 280,
  gap = 8,
}: UsePortalMenuOptions = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PortalMenuPosition | null>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - panelWidth),
      window.innerWidth - panelWidth - 8,
    );
    let top = rect.bottom + gap;
    const panelHeight = panelRef.current?.offsetHeight ?? estimatedHeight;
    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - panelHeight);
    }
    setPosition({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, panelWidth, estimatedHeight, gap]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
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
      updatePosition();
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
  }, [open, panelWidth, estimatedHeight, gap]);

  return {
    open,
    setOpen,
    rootRef,
    triggerRef,
    panelRef,
    position,
    updatePosition,
  };
}

type UseAnchoredToastOptions = {
  /** Whether the toast should be positioned (busy/status/error active). */
  active: boolean;
  width?: number;
  gap?: number;
  triggerRef: RefObject<HTMLElement | null>;
};

/** Positions a small status toast near a trigger (also portaled). */
export function useAnchoredToast({
  active,
  width = 224,
  gap = 4,
  triggerRef,
}: UseAnchoredToastOptions) {
  const [position, setPosition] = useState<PortalMenuPosition | null>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger || !active) {
      setPosition(null);
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    setPosition({ top: rect.bottom + gap, left });
  }

  useLayoutEffect(() => {
    updatePosition();
  }, [active, width, gap]);

  useEffect(() => {
    if (!active) return;
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [active, width, gap]);

  return { position, updatePosition };
}
