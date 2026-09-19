import { describe, expect, it } from "vitest";
import { formatOpenAiHttpError, sanitizeAdminErrorMessage } from "./httpError.ts";

const quotaBody = JSON.stringify({
  error: {
    message:
      "You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/",
    type: "insufficient_quota",
    param: null,
    code: "credit_balance_exhausted",
  },
});

describe("formatOpenAiHttpError", () => {
  it("maps exhausted credits to a short billing message", () => {
    expect(formatOpenAiHttpError(429, quotaBody)).toBe(
      "OpenAI has no credits remaining. Add billing at platform.openai.com.",
    );
  });

  it("maps other 429s to a rate-limit message", () => {
    expect(
      formatOpenAiHttpError(
        429,
        JSON.stringify({
          error: {
            message: "Rate limit reached for requests",
            type: "requests",
            code: "rate_limit_exceeded",
          },
        }),
      ),
    ).toBe("OpenAI is rate-limiting requests. Wait a moment and try again.");
  });

  it("maps 401 to an API-key message", () => {
    expect(formatOpenAiHttpError(401, "Unauthorized")).toBe(
      "OpenAI rejected the API key. Check OPENAI_API_KEY.",
    );
  });

  it("does not dump raw JSON for unknown failures", () => {
    const message = formatOpenAiHttpError(
      500,
      JSON.stringify({
        error: { message: "Internal server error", type: "server_error" },
      }),
    );
    expect(message).toContain("Internal server error");
    expect(message).not.toContain("{");
  });
});

describe("sanitizeAdminErrorMessage", () => {
  it("rewrites legacy OpenAI JSON dumps", () => {
    const dumped = `OpenAI request failed (429): ${quotaBody}`;
    expect(sanitizeAdminErrorMessage(dumped)).toBe(
      "OpenAI has no credits remaining. Add billing at platform.openai.com.",
    );
  });

  it("leaves ordinary messages unchanged", () => {
    expect(sanitizeAdminErrorMessage("Recipe not found.")).toBe("Recipe not found.");
  });
});
