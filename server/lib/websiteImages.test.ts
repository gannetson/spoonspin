import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchWebsiteImageCandidates } from "./websiteImages.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWebsiteImageCandidates", () => {
  it("extracts og:image and img tags from HTML", async () => {
    const html = `<!doctype html>
<html><head>
<meta property="og:image" content="/media/hero.jpg" />
<meta name="twitter:image" content="https://cdn.example.com/social.png" />
</head><body>
<img src="/uploads/food.webp" alt="dish" />
<img src="/favicon.ico" alt="" />
</body></html>`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const response = new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
        Object.defineProperty(response, "url", {
          value: "https://restaurant.example/",
        });
        return response;
      }),
    );

    const results = await fetchWebsiteImageCandidates("https://restaurant.example", {
      restaurantName: "Demo Bistro",
    });

    expect(results.map((item) => item.url)).toEqual([
      "https://restaurant.example/media/hero.jpg",
      "https://cdn.example.com/social.png",
      "https://restaurant.example/uploads/food.webp",
    ]);
    expect(results[0]?.attribution).toBe("From restaurant.example");
  });

  it("returns empty when website is missing", async () => {
    await expect(fetchWebsiteImageCandidates(undefined)).resolves.toEqual([]);
  });
});
