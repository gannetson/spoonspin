import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@/auth/AuthContext";
import { AuthModalProvider } from "@/auth/AuthModalContext";
import { EditRecipeProvider } from "@/admin/EditRecipeContext";
import { SelectImageProvider } from "@/admin/SelectImageContext";
import { ConsentProvider } from "@/consent/ConsentContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { MemoryRouter } from "react-router-dom";
import { RecipeView } from "@/components/RecipeView";
import type { Country, Drink, Recipe } from "@/types/content";

vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 200 })),
);

const recipe: Recipe = {
  id: "nl-stamppot",
  name: "Stamppot",
  description: "Mashed potatoes with greens.",
  category: "main",
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 25,
  difficulty: "easy",
  dietaryLabels: [],
  ingredients: [
    { name: "aardappelen", quantity: 1, unit: "kg" },
    { name: "boerenkool", quantity: 400, unit: "g" },
  ],
  steps: ["Boil the potatoes.", "Mash with kale."],
};

const drink: Drink = {
  name: "Buttermilk",
  type: "soft-drink",
  alcoholic: false,
  description: "A classic pairing.",
};

const country: Country = {
  code: "nl",
  slug: "netherlands",
  name: "Netherlands",
  flag: "🇳🇱",
  region: "Europe",
  introduction: "Dutch cuisine.",
  cuisineAliases: [],
  nationalDishId: recipe.id,
  cookReady: true,
  status: "published",
  menu: {
    starter: recipe,
    main: recipe,
    side: recipe,
    dessert: recipe,
    drink,
  },
};

function renderRecipe() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ConsentProvider>
          <AuthProvider>
            <AuthModalProvider>
              <SelectImageProvider>
                <EditRecipeProvider>
                  <RecipeView
                    country={country}
                    recipe={recipe}
                    drink={drink}
                    communityRecipes={[]}
                    onCommunityRecipesChange={() => undefined}
                    onCountryUpdated={() => undefined}
                    onBack={() => undefined}
                  />
                </EditRecipeProvider>
              </SelectImageProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ConsentProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("RecipeView shopping list", () => {
  it("places the create button under adjust servings", () => {
    renderRecipe();
    const servings = screen.getByLabelText(/adjust servings/i);
    const create = screen.getByRole("button", { name: /create shopping list/i });
    expect(
      servings.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens a modal where items can be removed and added", async () => {
    const user = userEvent.setup();
    renderRecipe();

    await user.click(screen.getByRole("button", { name: /create shopping list/i }));

    expect(screen.getByRole("dialog", { name: /shopping list/i })).toBeTruthy();
    expect(screen.getByText(/1 kg aardappelen/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /remove aardappelen/i }));
    expect(screen.queryByText(/1 kg aardappelen/i)).toBeNull();

    await user.type(screen.getByPlaceholderText(/e.g. milk/i), "extra lemon");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(screen.getByText("extra lemon")).toBeTruthy();

    expect(screen.getByRole("button", { name: /copy list/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/?text="),
    );
    expect(screen.queryByRole("link", { name: /plus/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^share$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /copy list/i }));
    expect(await navigator.clipboard.readText()).toBe(
      "Stamppot\n\n• 400 g boerenkool\n• extra lemon",
    );
  });
});

describe("RecipeView print", () => {
  it("marks the recipe as the print source and hides on-screen chrome", () => {
    renderRecipe();
    const article = screen.getByRole("article", { name: /stamppot/i });
    expect(article.className).toMatch(/print-recipe/);
    expect(
      screen.getByRole("button", { name: /print recipe/i }).closest("div"),
    ).toHaveClass("print:hidden");
  });
});
