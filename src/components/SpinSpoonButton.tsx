import { useT } from "@/i18n/LocaleContext";

type SpinSpoonButtonProps = {
  spinning: boolean;
  onClick: () => void;
  size?: "lg" | "sm" | "tile";
};

export function SpinSpoonButton({
  spinning,
  onClick,
  size = "lg",
}: SpinSpoonButtonProps) {
  const t = useT();
  const large = size === "lg";
  const tile = size === "tile";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={spinning}
      aria-busy={spinning}
      aria-label={spinning ? t("spin.ariaLabel.spinning") : t("spin.ariaLabel")}
      className={[
        "group relative inline-flex flex-col items-center justify-center",
        "border-4 border-ink/15 bg-tomato text-ochre",
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
          : tile
            ? [
                "size-28 shrink-0 gap-1 rounded-3xl px-2 py-2 sm:size-36",
                "shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
                "hover:shadow-[0_10px_0_#7a1f18,0_18px_32px_rgba(192,57,43,0.35)]",
                "active:shadow-[0_3px_0_#7a1f18,0_8px_16px_rgba(192,57,43,0.28)]",
                "disabled:hover:shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
              ].join(" ")
            : [
                "gap-1.5 rounded-[1.75rem] px-5 py-4",
                "shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
                "hover:shadow-[0_10px_0_#7a1f18,0_18px_32px_rgba(192,57,43,0.35)]",
                "active:shadow-[0_3px_0_#7a1f18,0_8px_16px_rgba(192,57,43,0.28)]",
                "disabled:hover:shadow-[0_8px_0_#7a1f18,0_14px_28px_rgba(192,57,43,0.3)]",
              ].join(" "),
        spinning ? "animate-wiggle" : "",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center justify-center rounded-full bg-white/25 leading-none",
          large
            ? "size-24 text-6xl sm:size-28 sm:text-7xl"
            : tile
              ? "size-12 text-3xl sm:size-16 sm:text-5xl"
              : "size-12 text-3xl",
          spinning ? "animate-spoon-spin" : "transition group-hover:rotate-12",
        ].join(" ")}
        aria-hidden="true"
      >
        🥄
      </span>
      {large ? (
        <>
          <span className="font-display text-3xl leading-none tracking-tight sm:text-4xl">
            {spinning ? t("spin.label.spinning") : t("spin.label")}
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cream/85">
            {spinning ? t("spin.hint.lg.spinning") : t("spin.hint.lg")}
          </span>
        </>
      ) : tile ? (
        <span className="max-w-full px-1 text-center font-display text-xs leading-tight sm:text-sm">
          {spinning ? t("spin.label.spinning") : t("spin.label")}
        </span>
      ) : (
        <>
          <span className="font-display text-xl leading-none tracking-tight">
            {spinning ? t("spin.label.spinning") : t("spin.label")}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cream/85">
            {spinning ? t("spin.hint.sm.spinning") : t("spin.hint.sm")}
          </span>
        </>
      )}
    </button>
  );
}

type FlagSpinnerProps = {
  current?: { flag: string; name: string };
  compact?: boolean;
};

export function FlagSpinner({ current, compact = false }: FlagSpinnerProps) {
  const t = useT();

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={[
        "flex flex-col items-center gap-2 text-center",
        compact ? "" : "w-full max-w-md sm:items-start sm:text-left",
      ].join(" ")}
    >
      <p className="text-sm uppercase tracking-[0.2em] text-stamp">
        {t("spin.flag.choosing")}
      </p>
      <p
        className={[
          "flag-glow font-display leading-none motion-safe:animate-pulse",
          compact ? "text-5xl" : "text-5xl sm:text-6xl",
        ].join(" ")}
        aria-hidden="true"
      >
        {current?.flag ?? "🌍"}
      </p>
      <p
        className={[
          "font-display text-burgundy",
          compact ? "text-xl" : "text-2xl",
        ].join(" ")}
      >
        {current?.name ?? t("spin.flag.finding")}
      </p>
    </div>
  );
}
