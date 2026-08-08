import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthContext";
import { LocaleProvider } from "@/i18n/LocaleContext";

const memoryStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
});

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/me")) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/api/countries")) {
      return new Response(JSON.stringify({ countries: [] }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ recipes: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("URL state", () => {
  it("restores a valid country from the URL", () => {
    renderAt("/?country=bg&mode=cook");
    expect(screen.getByRole("heading", { name: "Bulgaria" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tonight's menu/i })).toBeInTheDocument();
  });

  it("defaults to cook mode when a country URL has no mode", () => {
    renderAt("/?country=bg");
    expect(screen.getByRole("heading", { name: "Bulgaria" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tonight's menu/i })).toBeInTheDocument();
  });

  it("fails gracefully for invalid country codes", () => {
    renderAt("/?country=zz");
    expect(screen.getByText(/could not find a published country/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /spin the spoon/i })).toBeInTheDocument();
  });

  it("opens a recipe from cook mode", async () => {
    const user = userEvent.setup();
    renderAt("/?country=nl&mode=cook");
    await user.click(screen.getByRole("button", { name: /stamppot/i }));
    expect(screen.getByRole("button", { name: /back to menu/i })).toBeInTheDocument();
  });

  it("lets you manually select a country", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const combobox = screen.getByRole("combobox", {
      name: /or choose a country/i,
    });
    await user.click(combobox);
    await user.type(combobox, "Bulgaria");
    await user.click(screen.getByRole("option", { name: /bulgaria/i }));
    expect(screen.getByRole("heading", { name: "Bulgaria" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tonight's menu/i })).toBeInTheDocument();
  });
});
