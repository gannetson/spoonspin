import type { NextFunction, Request, Response } from "express";
import {
  insertApiRequestLog,
  shouldSkipAccessLog,
} from "../db/analytics.ts";

/** Fire-and-forget API access logger. Must run after trust proxy. */
export function apiRequestLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.path.startsWith("/api") || shouldSkipAccessLog(req.path)) {
    next();
    return;
  }

  const started = Date.now();
  res.on("finish", () => {
    insertApiRequestLog({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });
  });
  next();
}
