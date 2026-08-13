import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useConsent } from "@/consent/ConsentContext";
import { useT } from "@/i18n/LocaleContext";

export function PrivacyPage() {
  const t = useT();
  const {
    hasDecided,
    marketingAllowed,
    acceptMarketing,
    rejectMarketing,
  } = useConsent();

  const preferenceLabel = !hasDecided
    ? t("privacy.preference.undecided")
    : marketingAllowed
      ? t("privacy.preference.accepted")
      : t("privacy.preference.essential");

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stamp hover:text-tomato"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("privacy.back")}
        </Link>

        <h1 className="mt-6 font-display text-3xl text-burgundy sm:text-4xl">
          {t("privacy.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("privacy.intro")}</p>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">
            {t("privacy.necessary.title")}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t("privacy.necessary.body")}
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">
            {t("privacy.marketing.title")}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t("privacy.marketing.body")}
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">
            {t("privacy.analytics.title")}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t("privacy.analytics.body")}
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-ink/10 bg-cream/80 p-5">
          <h2 className="font-display text-2xl text-burgundy">
            {t("privacy.preference.title")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {t("privacy.preference.current", { status: preferenceLabel })}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
        </section>
      </div>
    </div>
  );
}
