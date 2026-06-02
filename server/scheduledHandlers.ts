/**
 * Scheduled (Heartbeat) handlers for JutJut.
 *
 * Registered in server/_core/index.ts before the Vite fallthrough.
 * All handlers authenticate via sdk.authenticateRequest — user.isCron must be true.
 *
 * Current jobs:
 *   POST /api/scheduled/admin-daily-summary  — daily admin digest email (07:00 AEST = 21:00 UTC)
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getOverviewMetrics, getSignupsLast30Days, getWaitlistSummary } from "./db.admin";
import { sendEmailSilent } from "./emailService";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Daily admin summary ──────────────────────────────────────────────────────

export async function adminDailySummaryHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    // Gather platform metrics
    const [metrics, signups, waitlist] = await Promise.all([
      getOverviewMetrics(),
      getSignupsLast30Days(),
      getWaitlistSummary(),
    ]);

    const today = new Date().toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Signups in last 24 hours
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const signupsToday = signups.filter((s) => new Date(s.date).getTime() >= yesterday).length;

    // Send to all admin users
    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "db-unavailable" });

    const admins = await db.select().from(users).where(eq(users.role, "admin"));

    const summaryData = {
      report_date: today,
      total_users: String(metrics.totalStudents ?? 0),
      total_employers: String(metrics.totalEmployers ?? 0),
      total_jobs: String(metrics.activeJobs ?? 0),
      total_applications: String(metrics.dropClaimsThisMonth ?? 0),
      signups_today: String(signupsToday),
      waitlist_total: String(waitlist.total ?? 0),
      dashboard_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/admin-dashboard`,
    };

    await Promise.allSettled(
      admins.map((admin) =>
        sendEmailSilent({
          to: admin.email ?? "",
          templateId: "admin_daily_summary",
          data: summaryData,
        })
      )
    );

    return res.json({ ok: true, adminCount: admins.length });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return res.status(500).json({
      error,
      stack,
      context: { url: req.url, taskUid: (req as any).taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
