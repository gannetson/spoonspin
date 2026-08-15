import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { useT } from "@/i18n/LocaleContext";
import { aboutMeta, setDocumentMeta } from "@/seo/documentMeta";
import { clearSeoJsonLd, setWebsiteJsonLd } from "@/seo/jsonLd";

export function AboutPage() {
  const t = useT();

  useEffect(() => {
    setDocumentMeta(aboutMeta(t));
    setWebsiteJsonLd(t("meta.about.description"));
    return () => {
      clearSeoJsonLd();
    };
  }, [t]);

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stamp hover:text-tomato"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("about.back")}
        </Link>

        <h1 className="mt-6 font-display text-3xl text-burgundy sm:text-4xl">
          {t("about.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("about.intro")}</p>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">{t("about.cook.title")}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">{t("about.cook.body")}</p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">{t("about.dine.title")}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">{t("about.dine.body")}</p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">
            {t("about.order.title")}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">{t("about.order.body")}</p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-2xl text-burgundy">
            {t("about.affiliate.title")}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t("about.affiliate.body")}
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
