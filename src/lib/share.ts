export function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareOrCopyUrl(
  url: string,
  title: string,
): Promise<"shared" | "copied"> {
  if (canUseWebShare()) {
    try {
      await navigator.share({ title, url, text: title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}

/** Native share sheet when available; otherwise open WhatsApp with the text. */
export async function shareText(input: {
  title: string;
  text: string;
}): Promise<"shared" | "whatsapp"> {
  if (canUseWebShare()) {
    try {
      await navigator.share({ title: input.title, text: input.text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  window.open(whatsappShareHref(input.text), "_blank", "noopener,noreferrer");
  return "whatsapp";
}
