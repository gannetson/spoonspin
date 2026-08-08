import { useState } from "react";
import { Share2 } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import { shareOrCopyUrl } from "@/lib/share";

type ShareButtonProps = {
  title: string;
  url: string;
};

export function ShareButton({ title, url }: ShareButtonProps) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => {
          try {
            const result = await shareOrCopyUrl(url, title);
            setMessage(
              result === "shared"
                ? t("share.status.shared")
                : t("share.status.copied"),
            );
            window.setTimeout(() => setMessage(null), 2000);
          } catch {
            setMessage(null);
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        aria-label={t("share.ariaLabel")}
      >
        <Share2 aria-hidden="true" className="size-4" />
        {t("share.button")}
      </button>
      {message ? (
        <p role="status" className="absolute right-0 top-full mt-2 text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </div>
  );
}
