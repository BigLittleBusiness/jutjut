/**
 * Pre-graduation reminder handler — /api/scheduled/pre-graduation-reminder
 *
 * Triggered weekly by a project-level Heartbeat cron.
 * Finds students whose graduation date falls within three reminder windows:
 *   - 3 months out  (84–90 days)
 *   - 1 month out   (28–34 days)
 *   - 1 week out    (7–13 days)
 *
 * Only sends to students who have NOT yet verified a personal email.
 * Idempotent: runs weekly so each window spans exactly 7 days.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { getUsersWithUpcomingGraduation } from "../db";
import { sendEmailSilent } from "../emailService";
import { logger } from "../_core/logger";

type ReminderWindow = {
  label: string;
  fromDays: number;
  toDays: number;
};

const REMINDER_WINDOWS: ReminderWindow[] = [
  { label: "3 months",  fromDays: 84, toDays: 90 },
  { label: "1 month",   fromDays: 28, toDays: 34 },
  { label: "1 week",    fromDays: 7,  toDays: 13 },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function preGraduationReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const now = new Date();
    let totalSent = 0;

    for (const window of REMINDER_WINDOWS) {
      const from = addDays(now, window.fromDays);
      const to   = addDays(now, window.toDays);

      const students = await getUsersWithUpcomingGraduation(from, to);

      for (const student of students) {
        if (!student.email) continue;

        const gradDate = student.graduationDate
          ? new Date(student.graduationDate).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "your graduation date";

        void sendEmailSilent({
          to: student.email,
          templateId: "pre_graduation_reminder",
          data: {
            student_name: student.name ?? "there",
            reminder_window: window.label,
            graduation_date: gradDate,
            settings_url: `${process.env.APP_BASE_URL ?? "https://jutjut.com.au"}/settings`,
          },
        });

        totalSent++;
      }

      logger.info(
        { window: window.label, count: students.length },
        "[preGraduationReminder] Sent reminders"
      );
    }

    return res.json({ ok: true, totalSent });
  } catch (err) {
    logger.error({ err }, "[preGraduationReminder] Unexpected error");
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
