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
import { dropImageUploadMiddleware } from "../uploadHandler.js";
import { startAutoRepostCron } from "../cron/autoRepost.js";
import { sesWebhookHandler } from "../sesWebhook.js";
import { adminDailySummaryHandler } from "../scheduledHandlers.js";
import { preGraduationReminderHandler } from "../cron/preGraduationReminder.js";
import { verifyAlumniEmailToken, verifyVouchToken, declineVouchToken, closeDb } from "../db.js";
import { sendEmailSilent } from "../emailService.js";
import { ENV } from "./env.js";
import { logger } from "./logger.js";

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

  // ── Trust proxy (Cloud Run / ECS ALB sit behind a load balancer) ────────────
  // Must be set before rate limiters so express-rate-limit reads the real client IP
  // from X-Forwarded-For rather than the load balancer IP.
  app.set("trust proxy", 1);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  // CSP notes:
  // - In dev: CSP is disabled entirely so Vite HMR works without restrictions.
  // - In production: we use a permissive script-src that allows 'unsafe-inline'
  //   because the Manus hosting platform injects an inline <script> runtime block
  //   (window.__MANUS_HOST_DEV__ = ...) that cannot be nonce-tagged. Without
  //   'unsafe-inline', the entire React bundle fails to execute, causing a blank page.
  //   When deploying to a self-hosted environment (AWS/GCP) without the Manus
  //   runtime, replace 'unsafe-inline' with a nonce-based CSP for stronger security.
  app.use(
    helmet({
      contentSecurityPolicy: ENV.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              scriptSrcAttr: ["'none'"],
              styleSrc: ["'self'", "https:", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
              fontSrc: ["'self'", "https:", "data:"],
              connectSrc: ["'self'", "https:"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
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


  // ── Health check (Cloud Run startup/liveness probe) ─────────────────────────
  // Registered before rate limiters so probes are never throttled.
  // Returns 200 with a JSON body; Cloud Run considers any 2xx a healthy instance.
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // ── Storage proxy (must come before rate limiters) ─────────────────────────
  registerStorageProxy(app);

  // ── OAuth routes ───────────────────────────────────────────────────────────
  registerOAuthRoutes(app);

  // ── Webhook routes (rate-limited) ──────────────────────────────────────────
  app.use("/webhooks", webhookLimiter);
  registerPinPaymentsWebhook(app);
  app.post("/webhooks/aws-ses", sesWebhookHandler);

  // ── Alumni email verification (GET /api/verify-alumni-email?token=...) ──────
  // Best-practice pattern: server validates token, then redirects browser to
  // a frontend result page. Token never enters React state.
  app.get("/api/verify-alumni-email", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const baseUrl = process.env.APP_BASE_URL ?? "https://jutjut.com.au";

    if (!token) {
      return res.redirect(`${baseUrl}/settings?verify=invalid`);
    }

    try {
      const user = await verifyAlumniEmailToken(token);
      if (!user) {
        return res.redirect(`${baseUrl}/settings?verify=expired`);
      }

      // Send confirmation email to the newly verified personal address
      if (user.personalEmail) {
        void sendEmailSilent({
          to: user.personalEmail,
          templateId: "alumni_email_confirmed",
          data: {
            student_name: user.name ?? "there",
            personal_email: user.personalEmail,
            dashboard_url: `${baseUrl}/dashboard`,
          },
        });
      }

      return res.redirect(`${baseUrl}/settings?verify=success`);
    } catch (err) {
      logger.error({ err }, "[verify-alumni-email] Unexpected error");
      return res.redirect(`${baseUrl}/settings?verify=error`);
    }
  });

  // ── Vouch verification / decline (GET /api/verify-vouch?token=...) ──────────
  app.get("/api/verify-vouch", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const baseUrl = process.env.APP_BASE_URL ?? "https://jutjut.com.au";

    if (!token) return res.redirect(`${baseUrl}/kit?vouch=invalid`);

    try {
      const vouch = await verifyVouchToken(token);
      if (!vouch) return res.redirect(`${baseUrl}/kit?vouch=expired`);
      logger.info({ vouchId: vouch.id }, "[verify-vouch] Verified");
      return res.redirect(`${baseUrl}/kit?vouch=verified`);
    } catch (err) {
      logger.error({ err }, "[verify-vouch] Unexpected error");
      return res.redirect(`${baseUrl}/kit?vouch=error`);
    }
  });

  app.get("/api/decline-vouch", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const baseUrl = process.env.APP_BASE_URL ?? "https://jutjut.com.au";

    if (!token) return res.redirect(`${baseUrl}/kit?vouch=invalid`);

    try {
      const vouch = await declineVouchToken(token);
      if (!vouch) return res.redirect(`${baseUrl}/kit?vouch=expired`);
      logger.info({ vouchId: vouch.id }, "[decline-vouch] Declined");
      return res.redirect(`${baseUrl}/kit?vouch=declined`);
    } catch (err) {
      logger.error({ err }, "[decline-vouch] Unexpected error");
      return res.redirect(`${baseUrl}/kit?vouch=error`);
    }
  });

  // ── File upload routes ────────────────────────────────────────────────────
  // POST /api/upload/drop-image — authenticated multipart upload, returns { key, url }
  app.post("/api/upload/drop-image", ...dropImageUploadMiddleware);

  // ── Scheduled heartbeat handlers ───────────────────────────────────────────
  app.post("/api/scheduled/admin-daily-summary", adminDailySummaryHandler);
  app.post("/api/scheduled/pre-graduation-reminder", preGraduationReminderHandler);

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
