import { Link } from "react-router-dom";
import { useT } from "@/i18n/LocaleContext";

type SiteFooterProps = {
  /** Use cream text on dark hero backgrounds. */
  tone?: "light" | "dark";
};

export function SiteFooter({ tone = "light" }: SiteFooterProps) {
  const t = useT();
  const linkClass =
    tone === "dark"
      ? "text-cream/90 underline-offset-2 hover:text-cream hover:underline"
      : "text-ink-soft underline-offset-2 hover:text-tomato hover:underline";

  return (
    <footer
      className={`border-t ${
        tone === "dark" ? "border-cream/15" : "border-ink/10"
      } ${tone === "dark" ? "bg-ink/40" : "bg-parchment/80"}`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className={`text-sm ${tone === "dark" ? "text-cream/70" : "text-ink-soft"}`}>
          {t("footer.tagline")}
        </p>
        <nav aria-label={t("footer.nav")}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <li>
              <Link to="/about" className={linkClass}>
                {t("footer.about")}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
