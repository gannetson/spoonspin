import { ImageOff } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";

type MediaPlaceholderProps = {
  labelKey?: string;
  className?: string;
  /** Dark overlay style for hero banners. */
  tone?: "light" | "dark";
  compact?: boolean;
};

export function MediaPlaceholder({
  labelKey = "media.placeholder",
  className = "",
  tone = "light",
  compact = false,
}: MediaPlaceholderProps) {
  const t = useT();
  const dark = tone === "dark";

  return (
    <div
      role="img"
      aria-label={t(labelKey)}
      className={`flex size-full flex-col items-center justify-center gap-2 border border-dashed ${
        dark
          ? "border-cream/25 bg-ink/80 text-cream/80"
          : "border-ink/15 bg-parchment text-ink-soft"
      } ${className}`}
    >
      <ImageOff
        aria-hidden="true"
        className={compact ? "size-5 opacity-70" : "size-7 opacity-70"}
      />
      <p
        className={`max-w-[12rem] text-center font-semibold ${
          compact ? "px-2 text-[0.65rem] leading-snug" : "px-3 text-xs leading-snug"
        }`}
      >
        {t(labelKey)}
      </p>
    </div>
  );
}
