import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareOrCopyUrl } from "@/lib/share";

type ShareButtonProps = {
  title: string;
  url: string;
};

export function ShareButton({ title, url }: ShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => {
          try {
            const result = await shareOrCopyUrl(url, title);
            setMessage(result === "shared" ? "Shared" : "Link copied");
            window.setTimeout(() => setMessage(null), 2000);
          } catch {
            setMessage(null);
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
        aria-label="Share this country"
      >
        <Share2 aria-hidden="true" className="size-4" />
        Share
      </button>
      {message ? (
        <p role="status" className="absolute right-0 top-full mt-2 text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </div>
  );
}
