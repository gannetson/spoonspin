type SpinSpoonButtonProps = {
  spinning: boolean;
  onClick: () => void;
  size?: "lg" | "sm";
};

export function SpinSpoonButton({
  spinning,
  onClick,
  size = "lg",
}: SpinSpoonButtonProps) {
  const large = size === "lg";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={spinning}
      aria-busy={spinning}
      className={[
        "group relative inline-flex flex-col items-center justify-center",
        "border-4 border-ink/15 bg-tomato text-cream",
        "transition duration-150",
        "hover:-translate-y-1 hover:bg-tomato-deep",
        "active:translate-y-2",
        "disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:bg-tomato",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-saffron",
        large
          ? [
              "w-full max-w-md gap-3 rounded-[2.5rem] px-8 py-8",
              "shadow-[0_12px_0_#7a1f18,0_22px_40px_rgba(192,57,43,0.35)]",
              "hover:shadow-[0_16px_0_#7a1f18,0_28px_48px_rgba(192,57,43,0.4)]",
              "active:shadow-[0_4px_0_#7a1f18,0_10px_20px_rgba(192,57,43,0.3)]",
              "disabled:hover:shadow-[0_12px_0_#7a1f18,0_22px_40px_rgba(192,57,43,0.35)]",
            ].join(" ")
          : [
              "gap-1.5 rounded-[1.75rem] px-5 py-4",
              "shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
              "hover:shadow-[0_10px_0_#7a1f18,0_18px_32px_rgba(192,57,43,0.35)]",
              "active:shadow-[0_3px_0_#7a1f18,0_8px_16px_rgba(192,57,43,0.28)]",
              "disabled:hover:shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
            ].join(" "),
        spinning ? "motion-safe:animate-wiggle" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center justify-center rounded-full bg-white/25 leading-none",
          large ? "size-24 text-6xl sm:size-28 sm:text-7xl" : "size-12 text-3xl",
          spinning
            ? "motion-safe:animate-spoon-spin"
            : "transition group-hover:rotate-12",
        ].join(" ")}
        aria-hidden="true"
      >
        🥄
      </span>
      <span
        className={[
          "font-display leading-none tracking-tight",
          large ? "text-3xl sm:text-4xl" : "text-xl",
        ].join(" ")}
      >
        {spinning ? "Spinning…" : "Spin the spoon!"}
      </span>
      {large ? (
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cream/85">
          {spinning ? "Hold onto your forks" : "Give it a whirl"}
        </span>
      ) : (
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cream/85">
          {spinning ? "Again…" : "Try another"}
        </span>
      )}
    </button>
  );
}

type FlagSpinnerProps = {
  current?: { flag: string; name: string };
  compact?: boolean;
};

export function FlagSpinner({ current, compact = false }: FlagSpinnerProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={[
        "flex flex-col items-center gap-2 text-center",
        compact ? "" : "w-full max-w-md sm:items-start sm:text-left",
      ].join(" ")}
    >
      <p className="text-sm uppercase tracking-[0.2em] text-stamp">Choosing…</p>
      <p
        className={[
          "font-display leading-none motion-safe:animate-pulse",
          compact ? "text-5xl" : "text-5xl sm:text-6xl",
        ].join(" ")}
        aria-hidden="true"
      >
        {current?.flag ?? "🌍"}
      </p>
      <p
        className={[
          "font-display text-ink",
          compact ? "text-xl" : "text-2xl",
        ].join(" ")}
      >
        {current?.name ?? "Finding a country…"}
      </p>
    </div>
  );
}
