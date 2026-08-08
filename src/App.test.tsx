import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import type { Country, Recipe } from "@/types/content";

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

function recipe(
  id: string,
  name: string,
  category: Recipe["category"],
): Recipe {
  return {
    id,
    name,
    description: `${name} fixture description used by App URL-state tests.`,
    category,
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    difficulty: "easy",
    dietaryLabels: ["vegetarian"],
    ingredients: [
      { name: "a", quantity: 1, unit: "g" },
      { name: "b", quantity: 1, unit: "g" },
    ],
    steps: ["One", "Two", "Three"],
  };
}

function cookCountry(
  code: string,
  name: string,
  flag: string,
  mainName: string,
): Country {
  return {
    code,
    slug: name.toLowerCase(),
    name,
    flag,
    region: "Europe",
    introduction: `${name} cuisine fixture introduction for App tests.`,
    cuisineAliases: [`${name} restaurant`],
    nationalDishId: `${code}-main`,
    cookReady: true,
    status: "published",
    menu: {
      starter: recipe(`${code}-starter`, `${name} starter`, "starter"),
      main: recipe(`${code}-main`, mainName, "main"),
      side: recipe(`${code}-side`, `${name} side`, "side"),
      dessert: recipe(`${code}-dessert`, `${name} dessert`, "dessert"),
      drink: {
        name: `${name} drink`,
        type: "soft-drink",
        alcoholic: false,
        description: "Fixture drink description for App URL-state tests.",
      },
    },
  };
}

const fixtureCountries: Country[] = [
  cookCountry("bg", "Bulgaria", "🇧🇬", "Shopska salad"),
  cookCountry("nl", "Netherlands", "🇳🇱", "Stamppot"),
];

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
      return new Response(JSON.stringify({ countries: fixtureCountries }), {
        status: 200,
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
  it("restores a valid country from the URL", async () => {
    renderAt("/?country=bg&mode=cook");
    expect(
      await screen.findByRole("heading", { name: "Bulgaria" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Tonight's menu/i }),
    ).toBeInTheDocument();
  });

  it("defaults to cook mode when a country URL has no mode", async () => {
    renderAt("/?country=bg");
    expect(
      await screen.findByRole("heading", { name: "Bulgaria" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Tonight's menu/i }),
    ).toBeInTheDocument();
  });

  it("fails gracefully for invalid country codes", async () => {
    renderAt("/?country=zz");
    await waitFor(() => {
      expect(
        screen.getByText(/could not find a published country/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /spin the spoon/i }),
    ).toBeInTheDocument();
  });

  it("opens a recipe from cook mode", async () => {
    const user = userEvent.setup();
    renderAt("/?country=nl&mode=cook");
    expect(
      await screen.findByRole("heading", { name: "Netherlands" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /stamppot/i }));
    expect(
      screen.getByRole("button", { name: /back to menu/i }),
    ).toBeInTheDocument();
  });

  it("lets you manually select a country", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const combobox = await screen.findByRole("combobox", {
      name: /or choose a country/i,
    });
    await user.click(combobox);
    await user.type(combobox, "Bulgaria");
    await user.click(screen.getByRole("option", { name: /bulgaria/i }));
    expect(
      screen.getByRole("heading", { name: "Bulgaria" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Tonight's menu/i }),
    ).toBeInTheDocument();
  });
});
