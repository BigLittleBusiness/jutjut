/**
 * Auto-repost cron job.
 * Runs daily to find expired jobs with auto_repost_enabled = true,
 * deducts 1 credit (or charges stored payment token), and creates a new job.
 *
 * Uses node-cron for scheduling.
 */

import cron from "node-cron";
import { getDb } from "../db";
import {
  getAutoRepostCandidates,
  getEmployerByUserId,
  getCreditBalance,
  adjustCredits,
} from "../db";
import { createCharge } from "../pinpayments";
import { jobs, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmailSilent } from "../emailService";
import { logger } from "../_core/logger";

async function processAutoReposts() {
  logger.info("[AutoRepost] Running auto-repost check...");
  const candidates = await getAutoRepostCandidates();

  if (candidates.length === 0) {
    logger.info("[AutoRepost] No candidates found.");
    return;
  }

  logger.info({ count: candidates.length }, `[AutoRepost] Processing ${candidates.length} candidate(s).`);

  for (const job of candidates) {
    try {
      await processOneJob(job);
    } catch (err) {
      logger.error({ err, jobId: job.id }, `[AutoRepost] Failed to process job ${job.id}`);
    }
  }
}

/** Fetch the user's email from the DB for notification purposes. */
async function getEmployerEmail(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.email ?? null;
}

async function getEmployerName(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Employer";
  const rows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.name ?? "Employer";
}

async function processOneJob(job: {
  id: number;
  title: string;
  employer: string;
  description: string | null;
  plainDescription: string | null;
  wage: string | null;
  distance: string | null;
  type: "casual" | "part-time" | "full-time" | "volunteer" | null;
  noCoverLetter: boolean;
  postedByUserId: number | null;
  isFeatured: boolean;
  paymentToken: string | null;
  autoRepostEnabled: boolean;
}) {
  if (!job.postedByUserId) return;

  const employer = await getEmployerByUserId(job.postedByUserId);
  if (!employer) {
    logger.warn(
      { userId: job.postedByUserId, jobId: job.id },
      `[AutoRepost] No employer profile for userId ${job.postedByUserId}, disabling auto-repost on job ${job.id}`
    );
    await disableAutoRepost(job.id);
    return;
  }

  const balance = await getCreditBalance(employer.id);
  const employerEmail = await getEmployerEmail(job.postedByUserId);
  const employerName = await getEmployerName(job.postedByUserId);
  const dashboardUrl = "https://jutjut.com.au/employer/dashboard";

  if (balance >= 1) {
    // Deduct credit and repost
    await repostJob(job, employer.id, "credit");

    // Send success notification email
    if (employerEmail) {
      const newBalance = balance - 1;
      const nextRepostDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
      await sendEmailSilent({
        to: employerEmail,
        templateId: "autorepost_success",
        data: {
          employer_name: employerName,
          job_title: job.title,
          remaining_balance: String(newBalance),
          next_repost_date: nextRepostDate.toLocaleDateString("en-AU"),
          job_url: dashboardUrl,
        },
      });
    }
  } else if (employer.paymentToken) {
    // Attempt to charge stored payment token for 1 credit ($15 AUD)
    try {
      const charge = await createCharge({
        amount: 15_00, // $15.00 AUD in cents
        description: `JutJut auto-repost: ${job.title}`,
        email: employerEmail ?? "noreply@jutjut.com.au",
        ipAddress: "0.0.0.0",
        customerToken: employer.paymentToken,
        metadata: {
          employer_id: String(employer.id),
          job_id: String(job.id),
          type: "auto_repost",
        },
      });

      if (charge.success) {
        // Add 1 credit then immediately deduct it
        await adjustCredits({
          employerId: employer.id,
          amount: 1,
          type: "purchase",
          reference: charge.token,
          description: `Auto-repost charge for job: ${job.title}`,
        });
        await repostJob(job, employer.id, "auto_repost_charge");

        // Send success notification email
        if (employerEmail) {
          const nextRepostDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
          await sendEmailSilent({
            to: employerEmail,
            templateId: "autorepost_success",
            data: {
              employer_name: employerName,
              job_title: job.title,
              remaining_balance: "0",
              next_repost_date: nextRepostDate.toLocaleDateString("en-AU"),
              job_url: dashboardUrl,
            },
          });
        }
      } else {
        logger.warn(
          { jobId: job.id, statusMessage: charge.status_message },
          `[AutoRepost] Charge failed for job ${job.id}: ${charge.status_message}`
        );
        await disableAutoRepost(job.id);

        // Send failure notification email
        if (employerEmail) {
          await sendEmailSilent({
            to: employerEmail,
            templateId: "autorepost_declined",
            data: {
              employer_name: employerName,
              job_title: job.title,
              failure_reason: "your payment was declined",
              dashboard_url: dashboardUrl,
            },
          });
        }
      }
    } catch (err) {
      logger.error({ err, jobId: job.id }, `[AutoRepost] Charge error for job ${job.id}`);
      await disableAutoRepost(job.id);

      // Send failure notification email
      if (employerEmail) {
        await sendEmailSilent({
          to: employerEmail,
          templateId: "autorepost_declined",
          data: {
            employer_name: employerName,
            job_title: job.title,
            failure_reason: "a payment processing error occurred",
            dashboard_url: dashboardUrl,
          },
        });
      }
    }
  } else {
    // No credits, no payment token
    await disableAutoRepost(job.id);

    // Send failure notification email
    if (employerEmail) {
      await sendEmailSilent({
        to: employerEmail,
        templateId: "autorepost_declined",
        data: {
          employer_name: employerName,
          job_title: job.title,
          failure_reason: "you have no credits and no saved payment method",
          dashboard_url: dashboardUrl,
        },
      });
    }
  }
}

async function repostJob(
  job: {
    id: number;
    title: string;
    employer: string;
    description: string | null;
    plainDescription: string | null;
    wage: string | null;
    distance: string | null;
    type: "casual" | "part-time" | "full-time" | "volunteer" | null;
    noCoverLetter: boolean;
    postedByUserId: number | null;
    isFeatured: boolean;
  },
  employerId: number,
  creditType: "credit" | "auto_repost_charge"
) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const autoRepostNextDate = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000);

  // Create new job record (copy of original)
  await db.insert(jobs).values({
    title: job.title,
    employer: job.employer,
    description: job.description,
    plainDescription: job.plainDescription,
    wage: job.wage,
    distance: job.distance,
    type: job.type ?? "casual",
    noCoverLetter: job.noCoverLetter,
    isActive: true,
    postedByUserId: job.postedByUserId,
    isFeatured: false, // featured is not carried over on repost
    expiresAt,
    autoRepostEnabled: true,
    autoRepostNextDate,
    viewCount: 0,
    applyCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Deduct 1 credit
  await adjustCredits({
    employerId,
    amount: -1,
    type: creditType === "credit" ? "auto_repost" : "auto_repost",
    reference: String(job.id),
    description: `Auto-repost of job: ${job.title}`,
  });

  // Disable auto-repost on the original expired job
  await db.update(jobs).set({ autoRepostEnabled: false, isActive: false }).where(eq(jobs.id, job.id));

  logger.info({ jobId: job.id }, `[AutoRepost] Successfully reposted job ${job.id} as new listing.`);
}

async function disableAutoRepost(jobId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set({ autoRepostEnabled: false }).where(eq(jobs.id, jobId));
}

/**
 * Start the auto-repost cron job.
 * Runs every day at 02:00 AEST (UTC+10) = 16:00 UTC.
 */
export function startAutoRepostCron() {
  // "0 16 * * *" = 16:00 UTC daily (02:00 AEST)
  cron.schedule("0 16 * * *", () => {
    processAutoReposts().catch((err) =>
      logger.error({ err }, "[AutoRepost] Unhandled error")
    );
  });
  logger.info("[AutoRepost] Cron job scheduled (daily at 02:00 AEST).");
}
