import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminItemMenu } from "@/components/AdminItemMenu";
import { LocaleProvider } from "@/i18n/LocaleContext";

const dumpedQuota =
  'OpenAI request failed (429): { "error": { "message": "You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/", "type": "insufficient_quota", "param": null, "code": "credit_balance_exhausted" } }';

describe("AdminItemMenu errors", () => {
  it("shows a friendly message instead of a raw OpenAI JSON dump", async () => {
    render(
      <LocaleProvider>
        <AdminItemMenu label="Pad Thai" error={dumpedQuota} onAction={() => undefined} />
      </LocaleProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/no credits left/i);
    expect(alert.textContent).not.toMatch(/insufficient_quota|credit_balance_exhausted/);
    expect(alert.textContent).not.toContain("{");
  });

  it("lets the admin dismiss the error toast", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AdminItemMenu label="Pad Thai" error={dumpedQuota} onAction={() => undefined} />
      </LocaleProvider>,
    );

    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
