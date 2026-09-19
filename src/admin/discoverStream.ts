export type DiscoverStreamEvent<TRestaurant = unknown> =
  | { type: "log"; message: string }
  | { type: "result"; notes: string; restaurants: TRestaurant[] }
  | { type: "error"; message: string };

export function parseDiscoverStreamLine<TRestaurant = unknown>(
  line: string,
): DiscoverStreamEvent<TRestaurant> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as DiscoverStreamEvent<TRestaurant>;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read a restaurant-discover NDJSON stream, forwarding log lines as they arrive.
 */
export async function readDiscoverRestaurantStream<TRestaurant>(
  response: Response,
  onLog: (message: string) => void,
): Promise<{ notes: string; restaurants: TRestaurant[] }> {
  if (!response.body) {
    throw new Error("Admin request failed (empty stream).");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: { notes: string; restaurants: TRestaurant[] } | null = null;
  let streamError: string | null = null;

  const handleLine = (line: string) => {
    const event = parseDiscoverStreamLine<TRestaurant>(line);
    if (!event) return;
    if (event.type === "log" && event.message) {
      onLog(event.message);
    } else if (event.type === "result") {
      result = {
        notes: event.notes,
        restaurants: event.restaurants ?? [],
      };
    } else if (event.type === "error") {
      streamError = event.message || "Could not discover restaurants.";
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) handleLine(line);
    if (done) {
      handleLine(buffer);
      break;
    }
  }

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error("Discover finished without a result.");
  return result;
}
