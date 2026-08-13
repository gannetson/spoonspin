import { useId } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  ClipboardList,
  Flag,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import { usePortalMenu } from "@/lib/usePortalMenu";

type AdminNavMenuProps = {
  tone?: "light" | "dark";
};

/** Site-wide admin links: Overview, Review, Reports, Users. */
export function AdminNavMenu({ tone = "light" }: AdminNavMenuProps) {
  const t = useT();
  const menuId = useId();
  const { open, setOpen, rootRef, triggerRef, panelRef, position } =
    usePortalMenu({ estimatedHeight: 340 });

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
            <Link
              to="/admin/users"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
            >
              <Users className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.users")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.users.hint")}
                </span>
              </span>
            </Link>
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <LayoutGrid className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.overview")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.overview.hint")}
                </span>
              </span>
            </Link>
            <Link
              to="/admin/reports"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <Activity className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.reports")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.reports.hint")}
                </span>
              </span>
            </Link>
            <Link
              to="/admin/review"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.review")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.review.hint")}
                </span>
              </span>
            </Link>
            <Link
              to="/admin/flags"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <Flag className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.flags")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.flags.hint")}
                </span>
              </span>
            </Link>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
          tone === "dark"
            ? "bg-cream/15 text-cream ring-1 ring-cream/30 hover:bg-cream/25"
            : "bg-ink text-cream"
        }`}
      >
        {t("app.admin")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menu}
    </div>
  );
}
