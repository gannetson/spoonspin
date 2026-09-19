import { describe, expect, it } from "vitest";
import { parseDiscoverStreamLine, readDiscoverRestaurantStream } from "./discoverStream";

describe("parseDiscoverStreamLine", () => {
  it("parses log and result events", () => {
    expect(
      parseDiscoverStreamLine('{"type":"log","message":"Tripadvisor · Leiden"}'),
    ).toEqual({ type: "log", message: "Tripadvisor · Leiden" });
    expect(
      parseDiscoverStreamLine(
        '{"type":"result","notes":"ok","restaurants":[{"name":"Oda"}]}',
      ),
    ).toMatchObject({ type: "result", notes: "ok" });
  });

  it("ignores junk", () => {
    expect(parseDiscoverStreamLine("not-json")).toBeNull();
    expect(parseDiscoverStreamLine("")).toBeNull();
  });
});

describe("readDiscoverRestaurantStream", () => {
  it("forwards logs and returns the final result", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('{"type":"log","message":"Google Places · Leiden"}\n'),
        );
        controller.enqueue(
          encoder.encode(
            '{"type":"result","notes":"done","restaurants":[{"name":"Oda","city":"Leiden"}]}\n',
          ),
        );
        controller.close();
      },
    });
    const logs: string[] = [];
    const result = await readDiscoverRestaurantStream(
      new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } }),
      (message) => logs.push(message),
    );
    expect(logs).toEqual(["Google Places · Leiden"]);
    expect(result.notes).toBe("done");
    expect(result.restaurants).toHaveLength(1);
  });
});
