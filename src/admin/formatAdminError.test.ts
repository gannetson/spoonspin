import { describe, expect, it } from "vitest";
import { formatAdminErrorMessage } from "./formatAdminError";

const t = (key: string) => `t:${key}`;

const dumpedQuota =
  'OpenAI request failed (429): { "error": { "message": "You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/", "type": "insufficient_quota", "param": null, "code": "credit_balance_exhausted" } }';

describe("formatAdminErrorMessage", () => {
  it("maps OpenAI credit dumps to a friendly message", () => {
    expect(formatAdminErrorMessage(dumpedQuota, t)).toBe("t:admin.error.openai.credits");
  });

  it("maps sanitized server credit errors", () => {
    expect(
      formatAdminErrorMessage(
        "OpenAI has no credits remaining. Add billing at platform.openai.com.",
        t,
      ),
    ).toBe("t:admin.error.openai.credits");
  });

  it("maps rate limits", () => {
    expect(
      formatAdminErrorMessage(
        "OpenAI is rate-limiting requests. Wait a moment and try again.",
        t,
      ),
    ).toBe("t:admin.error.openai.rateLimit");
  });

  it("maps missing API key", () => {
    expect(formatAdminErrorMessage("OPENAI_API_KEY is not configured.", t)).toBe(
      "t:admin.error.openai.auth",
    );
  });

  it("maps timeouts", () => {
    expect(
      formatAdminErrorMessage(
        "Server error with an empty response. The API may have timed out — try again.",
        t,
      ),
    ).toBe("t:admin.error.timeout");
  });

  it("keeps ordinary short errors", () => {
    expect(formatAdminErrorMessage("Recipe not found.", t)).toBe("Recipe not found.");
  });

  it("truncates very long unstructured errors", () => {
    const long = `Could not complete this admin action: ${"x".repeat(400)}`;
    const formatted = formatAdminErrorMessage(long, t);
    expect(formatted.endsWith("…")).toBe(true);
    expect(formatted.length).toBeLessThanOrEqual(220);
    expect(formatted).not.toContain("{");
  });
});
