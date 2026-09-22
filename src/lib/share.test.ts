import { describe, expect, it, vi } from "vitest";
import { canUseWebShare, shareText, whatsappShareHref } from "./share";

describe("shareText", () => {
  it("builds a WhatsApp share URL", () => {
    expect(whatsappShareHref("Fërgesë\n\n• 4 peppers")).toBe(
      "https://wa.me/?text=F%C3%ABrges%C3%AB%0A%0A%E2%80%A2%204%20peppers",
    );
  });

  it("opens WhatsApp when Web Share is unavailable", async () => {
    vi.stubGlobal("open", vi.fn());
    expect(canUseWebShare()).toBe(false);
    await expect(shareText({ title: "List", text: "milk" })).resolves.toBe("whatsapp");
    expect(window.open).toHaveBeenCalledWith(
      whatsappShareHref("milk"),
      "_blank",
      "noopener,noreferrer",
    );
    vi.unstubAllGlobals();
  });
});
