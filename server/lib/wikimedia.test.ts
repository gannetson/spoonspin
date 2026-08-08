/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { sameImageUrl, shuffleInPlace } from "./wikimedia";

describe("sameImageUrl", () => {
  it("ignores query strings", () => {
    expect(
      sameImageUrl(
        "https://upload.wikimedia.org/foo/bar.jpg?x=1",
        "https://upload.wikimedia.org/foo/bar.jpg?x=2",
      ),
    ).toBe(true);
  });

  it("distinguishes different paths", () => {
    expect(
      sameImageUrl(
        "https://upload.wikimedia.org/foo/a.jpg",
        "https://upload.wikimedia.org/foo/b.jpg",
      ),
    ).toBe(false);
  });
});

describe("shuffleInPlace", () => {
  it("keeps the same elements", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffleInPlace([...input]);
    expect([...shuffled].sort()).toEqual([...input].sort());
  });
});
