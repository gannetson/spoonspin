import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useT } from "@/i18n/LocaleContext";

type AdminNavMenuProps = {
  tone?: "light" | "dark";
};

/** Site-wide admin links: Overview, Review, Users. */
export function AdminNavMenu({ tone = "light" }: AdminNavMenuProps) {
  const t = useT();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
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

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-lg"
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
        </div>
      ) : null}
    </div>
  );
}
