type OpenAiErrorBody = {
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
  };
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseErrorBody(body: string): OpenAiErrorBody["error"] | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart < 0) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart)) as OpenAiErrorBody;
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function looksLikeQuota(code: string, type: string, message: string): boolean {
  return (
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    type === "insufficient_quota" ||
    /no credits remaining|insufficient.?quota|credit.?balance/i.test(message)
  );
}

function looksLikeRateLimit(code: string, type: string, message: string): boolean {
  return (
    code === "rate_limit_exceeded" ||
    type === "rate_limit_exceeded" ||
    /rate.?limit/i.test(message)
  );
}

function looksLikeAuth(code: string, type: string, message: string): boolean {
  return (
    code === "invalid_api_key" ||
    /invalid.?api.?key|incorrect api key/i.test(message) ||
    (type === "invalid_request_error" && /api key|unauthorized/i.test(message))
  );
}

/** Human-readable OpenAI HTTP failures — never dump raw JSON to clients. */
export function formatOpenAiHttpError(status: number, body: string): string {
  const error = parseErrorBody(body);
  const message = asString(error?.message);
  const type = asString(error?.type);
  const code = asString(error?.code);

  if (
    looksLikeQuota(code, type, message) ||
    (status === 429 && looksLikeQuota("", "", body))
  ) {
    return "OpenAI has no credits remaining. Add billing at platform.openai.com.";
  }
  if (status === 429 || looksLikeRateLimit(code, type, message)) {
    return "OpenAI is rate-limiting requests. Wait a moment and try again.";
  }
  if (status === 401 || looksLikeAuth(code, type, message)) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY.";
  }
  if (status === 502 || status === 503) {
    return "OpenAI is temporarily unavailable. Try again in a moment.";
  }
  if (message) {
    const short = message.length > 180 ? `${message.slice(0, 177).trim()}…` : message;
    return `OpenAI request failed (${status}): ${short}`;
  }
  return status > 0
    ? `OpenAI request failed (${status}). Try again.`
    : "OpenAI request failed. Try again.";
}

/**
 * If a thrown Error still contains an OpenAI JSON dump (older code paths),
 * replace it with a short message. Otherwise return the original text.
 */
export function sanitizeAdminErrorMessage(message: string): string {
  const match = message.match(/^OpenAI request failed \((\d+)\):\s*([\s\S]*)$/);
  if (match) {
    const status = Number(match[1]);
    const rest = match[2] ?? "";
    if (
      rest.trim().startsWith("{") ||
      /"error"|insufficient_quota|credit_balance/i.test(rest)
    ) {
      return formatOpenAiHttpError(status, rest);
    }
  }
  if (/"error"\s*:/.test(message) && message.includes("{")) {
    const start = message.indexOf("{");
    return formatOpenAiHttpError(0, message.slice(start));
  }
  return message;
}
