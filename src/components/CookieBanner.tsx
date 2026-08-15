import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useConsent } from "@/consent/ConsentContext";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";

export function CookieBanner() {
  const t = useT();
  const { hasDecided, acceptMarketing, rejectMarketing } = useConsent();

  if (hasDecided || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className={`fixed inset-x-0 bottom-0 ${zClass.cookieBanner} p-3 sm:p-4`}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-cream/95 p-4 shadow-[0_-8px_40px_rgba(20,32,28,0.12)] backdrop-blur-sm sm:p-5">
        <h2
          id="cookie-banner-title"
          className="font-display text-xl text-burgundy sm:text-2xl"
        >
          {t("cookie.banner.title")}
        </h2>
        <p id="cookie-banner-body" className="mt-2 text-sm leading-relaxed text-ink-soft">
          {t("cookie.banner.body")}{" "}
          <Link
            to="/privacy"
            className="font-semibold text-stamp underline decoration-stamp/40 underline-offset-2 hover:text-tomato"
          >
            {t("cookie.banner.privacyLink")}
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={acceptMarketing}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-tomato px-5 text-sm font-semibold text-cream hover:bg-tomato-deep"
          >
            {t("cookie.banner.accept")}
          </button>
          <button
            type="button"
            onClick={rejectMarketing}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink/20 bg-white/70 px-5 text-sm font-semibold text-ink hover:border-ink/40"
          >
            {t("cookie.banner.reject")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
