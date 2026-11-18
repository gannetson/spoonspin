import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import type { Country } from "@/types/content";
import type { Restaurant } from "@/restaurants/types";

const fetchRestaurants = vi.fn();

vi.mock("@/restaurants/client", () => ({
  fetchRestaurants: (...args: unknown[]) => fetchRestaurants(...args),
}));

const { DineSearch } = await import("@/components/DineSearch");
const { LocaleProvider } = await import("@/i18n/LocaleContext");
const { AuthProvider } = await import("@/auth/AuthContext");
const { SelectImageProvider } = await import("@/admin/SelectImageContext");
const { EditRestaurantProvider } = await import("@/admin/EditRestaurantContext");
const { AuthModalProvider } = await import("@/auth/AuthModalContext");

function wrap(active: Country) {
  return (
    <MemoryRouter>
      <LocaleProvider>
        <AuthProvider>
          <AuthModalProvider>
            <SelectImageProvider>
              <EditRestaurantProvider>
                <DineSearch country={active} onOpenRestaurant={() => {}} />
              </EditRestaurantProvider>
            </SelectImageProvider>
          </AuthModalProvider>
        </AuthProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

function country(code: string, name: string): Country {
  return {
    code,
    slug: name.toLowerCase(),
    name,
    flag: "🏳️",
    region: "Europe",
    introduction: `${name} food.`,
    cuisineAliases: [name.toLowerCase()],
    cookReady: true,
    status: "published",
  };
}

function restaurant(id: string, name: string): Restaurant {
  return {
    id,
    name,
    address: "Main street 1",
    city: "Leiden",
    cuisineCodes: [],
    mapsUrl: "https://maps.example/1",
  };
}

function readyWith(...names: string[]) {
  return {
    status: "ready" as const,
    restaurants: names.map((name, index) => restaurant(`r${index}`, name)),
    mapsSearchUrl: "https://maps.example/search",
    source: "db" as const,
  };
}

function renderDine(active: Country) {
  return render(wrap(active));
}

beforeEach(() => {
  fetchRestaurants.mockReset();
});

describe("DineSearch country switching", () => {
  it("does not search on its own before the visitor has asked for one", async () => {
    renderDine(country("it", "Italy"));

    await waitFor(() => {
      expect(screen.getByText(/enter a city or postcode/i)).toBeInTheDocument();
    });
    expect(fetchRestaurants).not.toHaveBeenCalled();
  });

  it("refreshes the list when the country changes after a search", async () => {
    fetchRestaurants.mockResolvedValueOnce(readyWith("Trattoria Roma"));
    const { rerender } = renderDine(country("it", "Italy"));

    await userEvent.click(screen.getByRole("button", { name: /search restaurants/i }));
    expect(await screen.findByText("Trattoria Roma")).toBeInTheDocument();

    // Spinning the spoon swaps the country under the same mounted component.
    fetchRestaurants.mockResolvedValueOnce(readyWith("Dhaka Grill"));
    rerender(wrap(country("bd", "Bangladesh")));

    expect(await screen.findByText("Dhaka Grill")).toBeInTheDocument();
    expect(screen.queryByText("Trattoria Roma")).not.toBeInTheDocument();
    expect(fetchRestaurants).toHaveBeenCalledTimes(2);
    expect(fetchRestaurants.mock.calls[1]![0]).toMatchObject({ countryCode: "bd" });
  });

  it("drops the previous country's results when the new one has none", async () => {
    fetchRestaurants.mockResolvedValueOnce(readyWith("Trattoria Roma"));
    const { rerender } = renderDine(country("it", "Italy"));

    await userEvent.click(screen.getByRole("button", { name: /search restaurants/i }));
    expect(await screen.findByText("Trattoria Roma")).toBeInTheDocument();

    fetchRestaurants.mockResolvedValueOnce({
      status: "ready" as const,
      restaurants: [],
      mapsSearchUrl: "https://maps.example/search",
      source: "db" as const,
    });
    rerender(wrap(country("rw", "Rwanda")));

    await waitFor(() => {
      expect(screen.queryByText("Trattoria Roma")).not.toBeInTheDocument();
    });
  });
});
