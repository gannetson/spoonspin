import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegionSelect } from "@/components/RegionSelect";
import { LocaleProvider } from "@/i18n/LocaleContext";
import type { Region } from "@/types/content";

function region(id: string, name: string): Region {
  return { id, countryCode: "cn", name };
}

function renderSelect(regions: Region[], value = "") {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  render(
    <LocaleProvider>
      <RegionSelect
        regions={regions}
        value={value}
        onSelect={onSelect}
        onClear={onClear}
      />
    </LocaleProvider>,
  );
  return { onSelect, onClear };
}

describe("RegionSelect", () => {
  it("offers the regions when there is a choice to make", () => {
    renderSelect([region("cn:CN-SC", "Sichuan"), region("cn:CN-GD", "Guangdong")]);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sichuan" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Guangdong" })).toBeInTheDocument();
  });

  it("hides itself when a country has only one region", () => {
    // "All regions" and the single region pick the same dishes, so the control
    // would ask for a decision without offering an alternative.
    renderSelect([region("cn:CN-SC", "Sichuan")]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("hides itself when a country has no regions", () => {
    renderSelect([]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("reports a chosen region", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSelect([
      region("cn:CN-SC", "Sichuan"),
      region("cn:CN-GD", "Guangdong"),
    ]);
    await user.selectOptions(screen.getByRole("combobox"), "cn:CN-GD");
    expect(onSelect).toHaveBeenCalledWith("cn:CN-GD");
  });

  it("clears back to every region", async () => {
    const user = userEvent.setup();
    const { onClear, onSelect } = renderSelect(
      [region("cn:CN-SC", "Sichuan"), region("cn:CN-GD", "Guangdong")],
      "cn:CN-SC",
    );
    await user.selectOptions(screen.getByRole("combobox"), "");
    expect(onClear).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
