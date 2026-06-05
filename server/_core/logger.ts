/**
 * logger.ts — Structured JSON logger for production (pino).
 *
 * In development: pretty-prints with colours via pino-pretty.
 * In production (NODE_ENV=production): emits newline-delimited JSON that
 * CloudWatch Logs, Datadog, and other AWS log aggregators can parse natively.
 *
 * Usage:
 *   import { logger } from "./_core/logger";
 *   logger.info({ userId: 42 }, "User logged in");
 *   logger.warn({ jobId: 7 }, "Job expired");
 *   logger.error({ err }, "Unhandled exception");
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    // Redact sensitive fields from all log lines
    redact: {
      paths: [
        "*.password",
        "*.token",
        "*.secret",
        "*.authorization",
        "*.cookie",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
    // Rename pino's default "msg" field to "message" for CloudWatch compatibility
    messageKey: "message",
    // Include hostname and pid in production for multi-instance tracing
    base: isDev ? undefined : { pid: process.pid, hostname: process.env.HOSTNAME ?? "unknown" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      })
    : undefined
);
