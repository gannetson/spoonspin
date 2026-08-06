type CountrySpinnerProps = {
  current?: { flag: string; name: string };
};

export function CountrySpinner({ current }: CountrySpinnerProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-[20rem] flex-col items-center justify-center rounded-[2rem] border border-ink/10 bg-cream/90 px-6 py-12 text-center"
    >
      <p className="text-sm uppercase tracking-[0.2em] text-stamp">Spinning</p>
      <p
        className="mt-6 font-display text-6xl motion-safe:animate-pulse sm:text-8xl"
        aria-hidden="true"
      >
        {current?.flag ?? "🌍"}
      </p>
      <p className="mt-4 font-display text-3xl text-ink sm:text-4xl">
        {current?.name ?? "Finding a country…"}
      </p>
      <p className="mt-3 text-ink-soft">Choosing your next plate…</p>
    </section>
  );
}
