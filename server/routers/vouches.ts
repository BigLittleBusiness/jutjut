/**
 * Vouches router — supervisor/teacher endorsement requests and management.
 *
 * Procedures:
 *   vouches.list     — get all vouches for the logged-in student
 *   vouches.request  — create a new vouch request and send verification email
 *   vouches.delete   — cancel/delete a pending vouch request
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { sendEmailSilent } from "../emailService";
import {
  addVouch,
  deleteVouch,
  getStudentVouches,
} from "../db";
import { logger } from "../_core/logger";

export const vouchesRouter = router({
  /** Return all vouches for the currently logged-in student. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const rows = await getStudentVouches(userId);
    return rows;
  }),

  /**
   * Create a new vouch request row and send the verification_request email
   * to the voucher's email address.
   *
   * Input:
   *   voucherName  — full name of the supervisor/teacher
   *   voucherTitle — role/title (e.g. "Science Teacher")
   *   voucherOrg   — school or organisation name (optional)
   *   voucherEmail — email address to send the request to
   *   skillName    — the skill/achievement being vouched for (optional)
   *   origin       — frontend origin for building the verify/decline URLs
   */
  request: protectedProcedure
    .input(
      z.object({
        voucherName: z.string().min(1).max(255),
        voucherTitle: z.string().max(255).optional(),
        voucherOrg: z.string().max(255).optional(),
        voucherEmail: z.string().email(),
        skillName: z.string().max(255).optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const studentName = ctx.user.name ?? "A JutJut student";

      // Generate a 7-day one-time token
      const token = randomBytes(32).toString("hex");

      // Insert the vouch row
      const vouchId = await addVouch({
        studentUserId: userId,
        voucherName: input.voucherName,
        voucherTitle: input.voucherTitle,
        voucherOrg: input.voucherOrg,
        voucherEmail: input.voucherEmail,
        skillName: input.skillName,
        token,
      });

      // Build verify and decline URLs
      const verifyUrl = `${input.origin}/api/verify-vouch?token=${token}`;
      const declineUrl = `${input.origin}/api/decline-vouch?token=${token}`;

      // Send the verification_request email to the voucher
      await sendEmailSilent({
        to: input.voucherEmail,
        templateId: "verification_request",
        data: {
          voucher_name: input.voucherName,
          student_name: studentName,
          skill_name: input.skillName ?? "their skills and character",
          verify_url: verifyUrl,
          decline_url: declineUrl,
        },
      });

      logger.info({ vouchId, voucherEmail: input.voucherEmail }, "[vouches] Request sent");
      return { success: true, vouchId };
    }),

  /**
   * Delete a pending vouch request (student cancels).
   * Only the owning student can delete their own vouches.
   * Only pending vouches can be deleted — verified/rejected ones are permanent records.
   */
  delete: protectedProcedure
    .input(z.object({ vouchId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Fetch the vouch first to verify ownership and status
      const rows = await getStudentVouches(userId);
      const vouch = rows.find((v) => v.id === input.vouchId);

      if (!vouch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vouch not found" });
      }
      if (vouch.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending vouches can be cancelled",
        });
      }

      await deleteVouch(input.vouchId, userId);
      logger.info({ vouchId: input.vouchId, userId }, "[vouches] Deleted");
      return { success: true };
    }),
});
