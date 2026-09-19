const MAX_DISPLAY_LENGTH = 220;

type Translate = (key: string) => string;

function extractJsonError(raw: string): {
  message: string;
  type: string;
  code: string;
} | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(start)) as {
      error?: { message?: unknown; type?: unknown; code?: unknown };
    };
    const error = parsed.error;
    if (!error) return null;
    return {
      message: typeof error.message === "string" ? error.message.trim() : "",
      type: typeof error.type === "string" ? error.type.trim() : "",
      code: typeof error.code === "string" ? error.code.trim() : "",
    };
  } catch {
    return null;
  }
}

function isCredits(text: string, code = "", type = ""): boolean {
  return (
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    type === "insufficient_quota" ||
    /no credits remaining|insufficient.?quota|credit.?balance|no credits left/i.test(text)
  );
}

function isRateLimit(text: string, code = "", type = ""): boolean {
  return (
    code === "rate_limit_exceeded" ||
    type === "rate_limit_exceeded" ||
    /rate-limiting requests|rate.?limit/i.test(text)
  );
}

function isAuth(text: string, code = ""): boolean {
  return (
    code === "invalid_api_key" ||
    /rejected the API key|OPENAI_API_KEY is not configured|invalid.?api.?key/i.test(text)
  );
}

function isUnavailable(text: string): boolean {
  return /temporarily unavailable|OpenAI request failed \(50[23]\)/i.test(text);
}

function isSignIn(text: string): boolean {
  return /please sign in again/i.test(text);
}

function isTimeout(text: string): boolean {
  return /timed out|empty response/i.test(text);
}

function truncate(text: string): string {
  if (text.length <= MAX_DISPLAY_LENGTH) return text;
  return `${text.slice(0, MAX_DISPLAY_LENGTH - 1).trim()}…`;
}

/**
 * Turn raw admin API errors (including OpenAI JSON dumps) into a short
 * message suitable for a toast.
 */
export function formatAdminErrorMessage(raw: string, t: Translate): string {
  const text = raw.trim();
  if (!text) return t("admin.error.generic");

  const extracted = extractJsonError(text);
  const haystack = [text, extracted?.message, extracted?.code, extracted?.type]
    .filter(Boolean)
    .join("\n");

  if (isCredits(haystack, extracted?.code, extracted?.type)) {
    return t("admin.error.openai.credits");
  }
  if (isRateLimit(haystack, extracted?.code, extracted?.type)) {
    return t("admin.error.openai.rateLimit");
  }
  if (isAuth(haystack, extracted?.code)) {
    return t("admin.error.openai.auth");
  }
  if (isUnavailable(text)) {
    return t("admin.error.openai.unavailable");
  }
  if (isSignIn(text)) {
    return t("admin.error.signIn");
  }
  if (isTimeout(text)) {
    return t("admin.error.timeout");
  }
  if (extracted?.message) {
    return truncate(extracted.message);
  }
  if (/^OpenAI request failed/i.test(text) && text.includes("{")) {
    return t("admin.error.openai.generic");
  }
  return truncate(text);
}
