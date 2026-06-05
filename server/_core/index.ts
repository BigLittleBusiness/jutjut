import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";
import { registerPinPaymentsWebhook } from "../webhooks/pinpayments.js";
import { startAutoRepostCron } from "../cron/autoRepost.js";
import { sesWebhookHandler } from "../sesWebhook.js";
import { adminDailySummaryHandler } from "../scheduledHandlers.js";
import { ENV } from "./env.js";
import { logger } from "./logger.js";
import { closeDb } from "../db.js";

// ─── Port helpers ─────────────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(port, () => srv.close(() => resolve(true)));
    srv.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** tRPC API: 100 requests per minute per IP */
const trpcLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/** Webhooks: 20 requests per minute per IP (SNS, PinPayments) */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests." },
});

// ─── Server bootstrap ─────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(
    helmet({
      // Allow inline scripts/styles needed by Vite HMR in dev
      contentSecurityPolicy: ENV.isProduction
        ? undefined
        : false,
    })
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: ENV.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  // ── Body parsing (1 MB limit for API; SNS webhooks send small JSON) ────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // ── gzip/brotli compression ────────────────────────────────────────────────
  app.use(compression());

  // ── Storage proxy (must come before rate limiters) ─────────────────────────
  registerStorageProxy(app);

  // ── OAuth routes ───────────────────────────────────────────────────────────
  registerOAuthRoutes(app);

  // ── Webhook routes (rate-limited) ──────────────────────────────────────────
  app.use("/webhooks", webhookLimiter);
  registerPinPaymentsWebhook(app);
  app.post("/webhooks/aws-ses", sesWebhookHandler);

  // ── Scheduled heartbeat handlers ───────────────────────────────────────────
  app.post("/api/scheduled/admin-daily-summary", adminDailySummaryHandler);

  // ── tRPC API (rate-limited) ────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    trpcLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Static / Vite ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ── Start listening ────────────────────────────────────────────────────────
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn({ preferredPort, port }, `Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info({ port }, `Server running on http://localhost:${port}/`);
    startAutoRepostCron();
  });

  // ── Graceful shutdown (ECS Fargate SIGTERM / local SIGINT) ─────────────────
  async function shutdown(signal: string) {
    logger.info({ signal }, `[shutdown] Received ${signal} — starting graceful shutdown`);

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, "[shutdown] Error closing HTTP server");
        process.exit(1);
      }

      try {
        await closeDb();
        logger.info("[shutdown] DB pool closed — exiting cleanly");
        process.exit(0);
      } catch (dbErr) {
        logger.error({ err: dbErr }, "[shutdown] Error closing DB pool");
        process.exit(1);
      }
    });

    // Force-kill after 10 s if graceful shutdown stalls
    setTimeout(() => {
      logger.error("[shutdown] Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error({ err }, "[startup] Fatal error during server startup");
  process.exit(1);
});
