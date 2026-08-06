import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("URL state", () => {
  it("restores a valid country from the URL", () => {
    renderAt("/?country=bg&mode=cook");
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
    await user.selectOptions(
      screen.getByLabelText(/or choose a country/i),
      "bg",
    );
    expect(screen.getByRole("heading", { name: "Bulgaria" })).toBeInTheDocument();
  });
});
