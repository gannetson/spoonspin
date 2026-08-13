/**
 * Shared stacking layers for overlays.
 *
 * Convention:
 * - Menu **triggers** stay in normal/local stacking (no z-30+ on the button root).
 * - Floating **panels** portal to `document.body` at `popover` (below modals).
 * - Modal backdrops/dialogs use `modal`.
 *
 * Never put a high z-index on a trigger wrapper that also hosts a modal —
 * that traps the modal and lets sibling card menus paint above the shade.
 */
export const Z_INDEX = {
  cookieBanner: 70,
  popover: 80,
  select: 90,
  modal: 100,
} as const;

/** Tailwind class strings matching {@link Z_INDEX}. */
export const zClass = {
  cookieBanner: "z-[70]",
  popover: "z-[80]",
  select: "z-[90]",
  modal: "z-[100]",
} as const;
