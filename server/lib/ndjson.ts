import type { Response } from "express";

export type NdjsonWriter = {
  log: (message: string) => void;
  send: (event: Record<string, unknown>) => void;
  end: () => void;
};

/** Start a chunked NDJSON response for long-running admin jobs. */
export function startNdjson(res: Response): NdjsonWriter {
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.socket?.setNoDelay(true);

  const send = (event: Record<string, unknown>) => {
    if (res.writableEnded || res.destroyed) return;
    res.write(`${JSON.stringify(event)}\n`);
  };

  return {
    send,
    log: (message: string) => send({ type: "log", message }),
    end: () => {
      if (!res.writableEnded) res.end();
    },
  };
}
