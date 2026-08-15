import { useT } from "@/i18n/LocaleContext";

/** Crawlable homepage section explaining what Spoonspin does. */
export function HomeExplainer() {
  const t = useT();
  return (
    <section
      aria-labelledby="home-explainer-heading"
      className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6"
    >
      <div className="rounded-[2rem] bg-cream/95 p-6 ring-1 ring-ink/10 sm:p-8">
        <h2
          id="home-explainer-heading"
          className="font-display text-2xl text-burgundy sm:text-3xl"
        >
          {t("home.explainer.heading")}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">
          {t("home.explainer.body")}
        </p>
      </div>
    </section>
  );
}
