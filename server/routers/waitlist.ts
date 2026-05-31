import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  addWaitlistSignup,
  getAllWaitlistSignups,
  getWaitlistCount,
} from "../db";
import { notifyOwner } from "../_core/notification";

export const waitlistRouter = router({
  // Public: join the waitlist
  join: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email("Please enter a valid email address")
          .max(320),
        firstName: z.string().max(128).optional(),
        role: z.enum(["student", "employer", "other"]).default("student"),
        school: z.string().max(255).optional(),
        source: z.string().max(64).default("landing_page"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Extract IP from request headers (proxy-aware)
      const ip =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        ctx.req.socket?.remoteAddress ||
        null;

      const result = await addWaitlistSignup({
        email: input.email,
        firstName: input.firstName ?? null,
        role: input.role,
        school: input.school ?? null,
        source: input.source,
        ipAddress: ip,
      });

      if (result.duplicate) {
        return { success: false, duplicate: true, message: "You're already on the waitlist! We'll be in touch soon." };
      }

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save your signup. Please try again.",
        });
      }

      // Notify the owner of a new waitlist signup (non-blocking)
      notifyOwner({
        title: "New JutJut Waitlist Signup",
        content: `${input.firstName ? input.firstName + " — " : ""}${input.email} (${input.role}${input.school ? ", " + input.school : ""}) joined the waitlist.`,
      }).catch(() => {/* silently ignore notification failures */});

      return {
        success: true,
        duplicate: false,
        message: "You're on the list! We'll let you know the moment JutJut launches at your school.",
      };
    }),

  // Public: get total count (for display on landing page)
  count: publicProcedure.query(async () => {
    const count = await getWaitlistCount();
    return { count };
  }),

  // Admin only: list all signups
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return getAllWaitlistSignups();
  }),
});
