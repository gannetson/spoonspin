import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AboutPage } from "@/components/AboutPage";
import { HomeExplainer } from "@/components/HomeExplainer";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { ConsentProvider } from "@/consent/ConsentContext";

function wrap(ui: ReactNode) {
  return (
    <MemoryRouter>
      <LocaleProvider>
        <ConsentProvider>{ui}</ConsentProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe("AboutPage", () => {
  it("renders product explanation and affiliate disclosure", () => {
    render(wrap(<AboutPage />));
    expect(
      screen.getByRole("heading", { level: 1, name: /about spoonspin/i }),
    ).toBeTruthy();
    expect(screen.getByText(/independent food discovery/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /affiliate links/i })).toBeTruthy();
    expect(screen.getByText(/may be affiliate links/i)).toBeTruthy();
  });
});

describe("HomeExplainer", () => {
  it("renders crawlable product summary", () => {
    render(wrap(<HomeExplainer />));
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /discover what the world eats/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText(/spin for a country/i)).toBeTruthy();
  });
});
