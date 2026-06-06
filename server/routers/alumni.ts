/**
 * Alumni router — personal email verification, badge settings, graduation date.
 *
 * Procedures:
 *   alumni.status           — get current alumni status for the logged-in student
 *   alumni.requestEmailVerify — send verification email to a new personal email address
 *   alumni.updateSettings   — update showAlumniBadge and/or graduationDate
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { sendEmailSilent } from "../emailService";
import {
  getAlumniStatus,
  requestAlumniEmailChange,
  updateAlumniSettings,
  getBadgeCounts,
  getStudentCredentials,
  getStudentVouches,
} from "../db";

export const alumniRouter = router({
  /** Return the current alumni status for the logged-in user. */
  status: protectedProcedure.query(async ({ ctx }) => {
    const status = await getAlumniStatus(ctx.user.id);
    if (!status) throw new TRPCError({ code: "NOT_FOUND", message: "User record not found." });
    return status;
  }),

  /** Return real badge counts (credentials + vouches + alumni badge). */
  badgeCounts: protectedProcedure.query(async ({ ctx }) => {
    return getBadgeCounts(ctx.user.id);
  }),

  /**
   * Request a personal email address change.
   * Sends a verification email to the new address with a 24-hour token.
   */
  requestEmailVerify: protectedProcedure
    .input(
      z.object({
        personalEmail: z.string().email().max(320),
        origin: z.string().url().max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Block school/educational email domains
      const emailDomain = input.personalEmail.split("@")[1]?.toLowerCase() ?? "";
      const SCHOOL_DOMAINS = [".edu.au", ".edu", ".ac.uk", ".school", ".k12"];
      if (SCHOOL_DOMAINS.some((d) => emailDomain.endsWith(d))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "School email addresses are not accepted. Please use a personal email address.",
        });
      }

      // Block if already verified
      const current = await getAlumniStatus(ctx.user.id);
      if (current?.alumniEmailVerified) {
        // Allow changing to a different email, but not re-verifying the same one
        if (current.personalEmail === input.personalEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This email address is already verified.",
          });
        }
      }

      // Generate a secure random token (32 bytes = 64 hex chars)
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await requestAlumniEmailChange(ctx.user.id, input.personalEmail, token, expiry);

      const verifyUrl = `${input.origin}/api/verify-alumni-email?token=${token}`;

      void sendEmailSilent({
        to: input.personalEmail,
        templateId: "alumni_email_verify",
        data: {
          student_name: ctx.user.name ?? "there",
          personal_email: input.personalEmail,
          verify_url: verifyUrl,
        },
      });

      return { success: true };
    }),

  /** Return the student's own credentials and vouches for the badge modal. */
  myKit: protectedProcedure.query(async ({ ctx }) => {
    const [credentials, vouches] = await Promise.all([
      getStudentCredentials(ctx.user.id),
      getStudentVouches(ctx.user.id),
    ]);
    return { credentials, vouches };
  }),

  /** Update alumni badge visibility and/or graduation date. */
  updateSettings: protectedProcedure
    .input(
      z.object({
        showAlumniBadge: z.boolean().optional(),
        graduationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateAlumniSettings(ctx.user.id, {
        showAlumniBadge: input.showAlumniBadge,
        graduationDate: input.graduationDate,
      });
      return { success: true };
    }),
});
