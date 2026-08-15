import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      files.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("Restaurant API credential safety", () => {
  it("never embeds provider secrets in client source", () => {
    const srcFiles = walk(join(process.cwd(), "src"));
    for (const file of srcFiles) {
      const contents = readFileSync(file, "utf8");
      expect(contents.includes("GOOGLE_PLACES_API_KEY")).toBe(false);
      expect(contents.includes("MAPBOX_ACCESS_TOKEN")).toBe(false);
      expect(contents.includes("process.env.GOOGLE")).toBe(false);
      expect(contents.includes("process.env.MAPBOX")).toBe(false);
    }
    expect(srcFiles.length).toBeGreaterThan(0);
  });

  it("keeps Google and Mapbox credentials on the server only", () => {
    const server = readFileSync(join(process.cwd(), "server/index.ts"), "utf8");
    const google = readFileSync(
      join(process.cwd(), "server/providers/googlePlaces.ts"),
      "utf8",
    );
    const mapbox = readFileSync(
      join(process.cwd(), "server/providers/mapbox.ts"),
      "utf8",
    );

    expect(server).toContain("GOOGLE_PLACES_API_KEY");
    expect(server).toContain("MAPBOX_ACCESS_TOKEN");
    expect(google).toContain("X-Goog-Api-Key");
    expect(mapbox).toContain("access_token");
  });
});
