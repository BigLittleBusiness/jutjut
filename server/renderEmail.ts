/**
 * renderEmail — lightweight template engine for JutJut transactional emails.
 *
 * Templates are stored as objects in this file (HTML + plain-text strings).
 * Placeholders use {{variable_name}} syntax.
 * Usage:
 *   const { html, text, subject } = renderEmail('job_application_confirmation', { student_name: 'Alice', ... });
 */

// ─── Base layout ─────────────────────────────────────────────────────────────

const BASE_HTML = (content: string, preheader = "") => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JutJut</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #1f2937; padding: 24px 32px; }
    .header-logo { font-size: 22px; font-weight: 900; color: #14b8a6; letter-spacing: -0.5px; }
    .header-logo span { color: #ffffff; }
    .body { padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #1f2937; }
    p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #374151; }
    .btn { display: inline-block; background: #14b8a6; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 8px 0 16px; }
    .info-box { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .info-box p { margin: 0; color: #134e4a; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0 0 4px; }
    .footer a { color: #6b7280; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .badge-amber { background: #fef9c3; color: #854d0e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">jut<span>jut</span></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>JutJut Pty Ltd · Australia</p>
      <p>Questions? <a href="mailto:hello@jutjut.com.au">hello@jutjut.com.au</a></p>
      <p>{{unsubscribe_block}}</p>
    </div>
  </div>
</body>
</html>`;

const TRANSACTIONAL_FOOTER = "";
const MARKETING_FOOTER = `<a href="{{unsubscribe_url}}" style="color:#6b7280;font-size:12px;">Unsubscribe from marketing emails</a>`;

// ─── Template definitions ─────────────────────────────────────────────────────

type Template = {
  subject: string;
  html: string;
  text: string;
  isMarketing?: boolean;
};

const TEMPLATES: Record<string, Template> = {

  // ── 1. Student: email verification ──────────────────────────────────────────
  student_verify_email: {
    subject: "Verify your JutJut email address",
    html: BASE_HTML(`
      <h1>Welcome to JutJut! 👋</h1>
      <p>Hi {{student_name}},</p>
      <p>Thanks for signing up. Please verify your email address to activate your account.</p>
      <a href="{{verify_url}}" class="btn">Verify Email Address</a>
      <p style="font-size:13px;color:#6b7280;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `, "Verify your email to get started on JutJut"),
    text: `Welcome to JutJut!\n\nHi {{student_name}},\n\nPlease verify your email: {{verify_url}}\n\nThis link expires in 24 hours.`,
  },

  // ── 2. Student: password reset ───────────────────────────────────────────────
  student_password_reset: {
    subject: "Reset your JutJut password",
    html: BASE_HTML(`
      <h1>Password reset request</h1>
      <p>Hi {{student_name}},</p>
      <p>We received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
      <a href="{{reset_url}}" class="btn">Reset Password</a>
      <p style="font-size:13px;color:#6b7280;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `, "Reset your JutJut password"),
    text: `Reset your JutJut password\n\nHi {{student_name}},\n\nReset link (expires in 1 hour): {{reset_url}}\n\nIf you didn't request this, ignore this email.`,
  },

  // ── 3. Student: skill verified ───────────────────────────────────────────────
  skill_verified: {
    subject: "Your skill has been verified ✅",
    html: BASE_HTML(`
      <h1>Skill verified!</h1>
      <p>Hi {{student_name}},</p>
      <p><strong>{{voucher_name}}</strong> ({{voucher_title}}) has verified your skill:</p>
      <div class="info-box"><p><strong>{{skill_name}}</strong></p></div>
      <p>This is now visible on your My Kit profile and can be shared with employers.</p>
      <a href="{{kit_url}}" class="btn">View My Kit</a>
    `, "A skill has been verified on your JutJut profile"),
    text: `Skill verified!\n\nHi {{student_name}},\n\n{{voucher_name}} ({{voucher_title}}) verified your skill: {{skill_name}}\n\nView your kit: {{kit_url}}`,
  },

  // ── 4. Student: job application confirmation ─────────────────────────────────
  job_application_confirmation: {
    subject: "Application submitted — {{job_title}}",
    html: BASE_HTML(`
      <h1>Application submitted 🎉</h1>
      <p>Hi {{student_name}},</p>
      <p>Your application for <strong>{{job_title}}</strong> at <strong>{{employer_name}}</strong> has been received.</p>
      <div class="info-box">
        <p><strong>Role:</strong> {{job_title}}</p>
        <p><strong>Employer:</strong> {{employer_name}}</p>
        <p><strong>Applied:</strong> {{applied_date}}</p>
      </div>
      <p>The employer will review your My Kit profile. We'll notify you of any updates.</p>
      <a href="{{applications_url}}" class="btn">View My Applications</a>
    `, "Your application has been submitted"),
    text: `Application submitted!\n\nHi {{student_name}},\n\nYou applied for {{job_title}} at {{employer_name}} on {{applied_date}}.\n\nView applications: {{applications_url}}`,
  },

  // ── 5. Student: application outcome ─────────────────────────────────────────
  application_outcome: {
    subject: "Update on your application — {{job_title}}",
    html: BASE_HTML(`
      <h1>Application update</h1>
      <p>Hi {{student_name}},</p>
      <p>There's an update on your application for <strong>{{job_title}}</strong> at <strong>{{employer_name}}</strong>:</p>
      <div class="info-box"><p><span class="badge {{outcome_badge_class}}">{{outcome_label}}</span> &nbsp;{{outcome_message}}</p></div>
      <a href="{{applications_url}}" class="btn">View Application</a>
    `, "There's an update on your job application"),
    text: `Application update\n\nHi {{student_name}},\n\nYour application for {{job_title}} at {{employer_name}} is now: {{outcome_label}}\n\n{{outcome_message}}\n\nView: {{applications_url}}`,
  },

  // ── 6. Student: placement created confirmation ───────────────────────────────
  placement_created_confirmation: {
    subject: "Work placement request submitted",
    html: BASE_HTML(`
      <h1>Placement request submitted</h1>
      <p>Hi {{student_name}},</p>
      <p>Your school has submitted a work placement request with <strong>{{employer_name}}</strong>.</p>
      <div class="info-box">
        <p><strong>Employer:</strong> {{employer_name}}</p>
        <p><strong>Dates:</strong> {{placement_start}} – {{placement_end}}</p>
        <p><strong>Hours/week:</strong> {{hours_per_week}}</p>
      </div>
      <p>The employer will review and respond. You'll receive an email when there's an update.</p>
    `, "Your work placement request has been submitted"),
    text: `Placement request submitted\n\nHi {{student_name}},\n\nPlacement with {{employer_name}}: {{placement_start}} to {{placement_end}}, {{hours_per_week}} hrs/week.\n\nYou'll be notified of updates.`,
  },

  // ── 7. Student: placement status update ─────────────────────────────────────
  placement_status_update: {
    subject: "Placement update — {{employer_name}}",
    html: BASE_HTML(`
      <h1>Placement update</h1>
      <p>Hi {{student_name}},</p>
      <p>Your placement with <strong>{{employer_name}}</strong> has been updated:</p>
      <div class="info-box"><p><span class="badge {{status_badge_class}}">{{status_label}}</span> &nbsp;{{status_message}}</p></div>
      <a href="{{placements_url}}" class="btn">View Placement</a>
    `, "Your work placement has been updated"),
    text: `Placement update\n\nHi {{student_name}},\n\nYour placement with {{employer_name}} is now: {{status_label}}\n\n{{status_message}}\n\nView: {{placements_url}}`,
  },

  // ── 8. Student: drop claimed ─────────────────────────────────────────────────
  drop_claimed: {
    subject: "You claimed The Drop — {{drop_title}}",
    html: BASE_HTML(`
      <h1>You claimed The Drop! 🎁</h1>
      <p>Hi {{student_name}},</p>
      <p>You successfully claimed: <strong>{{drop_title}}</strong></p>
      <div class="info-box">
        <p><strong>From:</strong> {{business_name}}</p>
        <p><strong>Instructions:</strong> {{drop_instructions}}</p>
        <p><strong>Expires:</strong> {{drop_expires}}</p>
      </div>
      <p>Show this email or your claim code at the business to redeem.</p>
    `, "You claimed a JutJut Drop"),
    text: `You claimed The Drop!\n\nHi {{student_name}},\n\nDrop: {{drop_title}} from {{business_name}}\nInstructions: {{drop_instructions}}\nExpires: {{drop_expires}}`,
  },

  // ── 9. Student: drop reminder (opt-in) ──────────────────────────────────────
  drop_reminder: {
    subject: "⏰ Your Drop expires in 24 hours — {{drop_title}}",
    isMarketing: true,
    html: BASE_HTML(`
      <h1>Your Drop expires soon ⏰</h1>
      <p>Hi {{student_name}},</p>
      <p>Your claimed Drop <strong>{{drop_title}}</strong> from <strong>{{business_name}}</strong> expires in <strong>24 hours</strong>.</p>
      <p><strong>Instructions:</strong> {{drop_instructions}}</p>
      <a href="{{drop_url}}" class="btn">View Drop Details</a>
    `, "Your Drop expires in 24 hours"),
    text: `Drop expiring soon!\n\nHi {{student_name}},\n\n{{drop_title}} from {{business_name}} expires in 24 hours.\n\nInstructions: {{drop_instructions}}\n\nView: {{drop_url}}`,
  },

  // ── 10. Student: weekly drop announcement (opt-in) ──────────────────────────
  weekly_drop_announcement: {
    subject: "🔥 This week's Drops are live",
    isMarketing: true,
    html: BASE_HTML(`
      <h1>This week's Drops are live 🔥</h1>
      <p>Hi {{student_name}},</p>
      <p>New perks are available from local businesses. Claim them before they're gone!</p>
      <div class="info-box"><p>{{drops_summary}}</p></div>
      <a href="{{drops_url}}" class="btn">Browse This Week's Drops</a>
    `, "New Drops are available on JutJut"),
    text: `This week's Drops are live!\n\nHi {{student_name}},\n\n{{drops_summary}}\n\nBrowse: {{drops_url}}`,
  },

  // ── 11. Employer: email verification ────────────────────────────────────────
  employer_verify_email: {
    subject: "Verify your JutJut employer account",
    html: BASE_HTML(`
      <h1>Welcome to JutJut for Employers</h1>
      <p>Hi {{employer_name}},</p>
      <p>Thanks for creating an employer account. Please verify your email to get started.</p>
      <a href="{{verify_url}}" class="btn">Verify Email Address</a>
      <p style="font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>
    `, "Verify your JutJut employer account"),
    text: `Welcome to JutJut for Employers!\n\nHi {{employer_name}},\n\nVerify your email: {{verify_url}}\n\nExpires in 24 hours.`,
  },

  // ── 12. Employer: password reset ─────────────────────────────────────────────
  employer_password_reset: {
    subject: "Reset your JutJut employer password",
    html: BASE_HTML(`
      <h1>Password reset request</h1>
      <p>Hi {{employer_name}},</p>
      <p>Reset your password using the link below. Expires in <strong>1 hour</strong>.</p>
      <a href="{{reset_url}}" class="btn">Reset Password</a>
    `, "Reset your JutJut employer password"),
    text: `Reset your JutJut password\n\nHi {{employer_name}},\n\nReset link (1 hour): {{reset_url}}`,
  },

  // ── 13. Employer: credit purchase receipt ───────────────────────────────────
  credit_purchase_receipt: {
    subject: "Receipt — JutJut credit purchase",
    html: BASE_HTML(`
      <h1>Payment received 🧾</h1>
      <p>Hi {{employer_name}},</p>
      <p>Your credit purchase was successful.</p>
      <div class="info-box">
        <p><strong>Pack:</strong> {{pack_name}}</p>
        <p><strong>Credits added:</strong> {{credits_added}}</p>
        <p><strong>Amount charged:</strong> {{amount_aud}} AUD (incl. GST)</p>
        <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
        <p><strong>Date:</strong> {{purchase_date}}</p>
      </div>
      <p>Your new balance is <strong>{{new_balance}} credits</strong>.</p>
      <a href="{{dashboard_url}}" class="btn">Go to Dashboard</a>
    `, "Your JutJut credit purchase receipt"),
    text: `Payment received\n\nHi {{employer_name}},\n\nPack: {{pack_name}}\nCredits added: {{credits_added}}\nAmount: {{amount_aud}} AUD\nTransaction: {{transaction_id}}\nDate: {{purchase_date}}\nNew balance: {{new_balance}} credits\n\nDashboard: {{dashboard_url}}`,
  },

  // ── 14. Employer: low credit balance ────────────────────────────────────────
  credit_low_balance: {
    subject: "⚠️ Low credit balance — top up to keep your jobs live",
    html: BASE_HTML(`
      <h1>Low credit balance ⚠️</h1>
      <p>Hi {{employer_name}},</p>
      <p>Your JutJut credit balance is low — you have <strong>{{current_balance}} credit(s)</strong> remaining.</p>
      <p>Top up now to ensure your job listings stay active and auto-repost continues uninterrupted.</p>
      <a href="{{topup_url}}" class="btn">Top Up Credits</a>
    `, "Your JutJut credit balance is low"),
    text: `Low credit balance\n\nHi {{employer_name}},\n\nYou have {{current_balance}} credit(s) remaining.\n\nTop up: {{topup_url}}`,
  },

  // ── 15. Employer: job post confirmation ─────────────────────────────────────
  job_post_confirmation: {
    subject: "Job posted — {{job_title}}",
    html: BASE_HTML(`
      <h1>Job posted successfully ✅</h1>
      <p>Hi {{employer_name}},</p>
      <p>Your job listing is now live on JutJut.</p>
      <div class="info-box">
        <p><strong>Role:</strong> {{job_title}}</p>
        <p><strong>Type:</strong> {{job_type}}</p>
        <p><strong>Credits used:</strong> {{credits_used}}</p>
        <p><strong>Expires:</strong> {{expires_date}}</p>
      </div>
      <a href="{{job_url}}" class="btn">View Listing</a>
    `, "Your job listing is live on JutJut"),
    text: `Job posted!\n\nHi {{employer_name}},\n\nRole: {{job_title}}\nType: {{job_type}}\nCredits used: {{credits_used}}\nExpires: {{expires_date}}\n\nView: {{job_url}}`,
  },

  // ── 16. Employer: job post expired ──────────────────────────────────────────
  job_post_expired: {
    subject: "Your job listing has expired — {{job_title}}",
    html: BASE_HTML(`
      <h1>Job listing expired</h1>
      <p>Hi {{employer_name}},</p>
      <p>Your listing for <strong>{{job_title}}</strong> has expired and is no longer visible to students.</p>
      <p>Repost it with one credit to bring it back to the top of the board.</p>
      <a href="{{repost_url}}" class="btn">Repost This Job</a>
    `, "Your JutJut job listing has expired"),
    text: `Job listing expired\n\nHi {{employer_name}},\n\n{{job_title}} has expired. Repost it: {{repost_url}}`,
  },

  // ── 17. Employer: auto-repost success ───────────────────────────────────────
  autorepost_success: {
    subject: "Auto-repost successful — {{job_title}}",
    html: BASE_HTML(`
      <h1>Auto-repost successful ♻️</h1>
      <p>Hi {{employer_name}},</p>
      <p>Your job listing <strong>{{job_title}}</strong> was automatically reposted.</p>
      <div class="info-box">
        <p><strong>Credit deducted:</strong> 1</p>
        <p><strong>Remaining balance:</strong> {{remaining_balance}}</p>
        <p><strong>Next repost:</strong> {{next_repost_date}}</p>
      </div>
      <a href="{{job_url}}" class="btn">View Listing</a>
    `, "Your job was auto-reposted on JutJut"),
    text: `Auto-repost successful\n\nHi {{employer_name}},\n\n{{job_title}} was reposted.\nRemaining balance: {{remaining_balance}}\nNext repost: {{next_repost_date}}\n\nView: {{job_url}}`,
  },

  // ── 18. Employer: auto-repost declined ──────────────────────────────────────
  autorepost_declined: {
    subject: "⚠️ Auto-repost failed — {{job_title}}",
    html: BASE_HTML(`
      <h1>Auto-repost failed ⚠️</h1>
      <p>Hi {{employer_name}},</p>
      <p>We couldn't auto-repost <strong>{{job_title}}</strong> because {{failure_reason}}.</p>
      <p>Auto-repost has been disabled for this listing. Top up your credits or update your payment method to re-enable it.</p>
      <a href="{{dashboard_url}}" class="btn">Go to Dashboard</a>
    `, "Auto-repost failed for your JutJut listing"),
    text: `Auto-repost failed\n\nHi {{employer_name}},\n\n{{job_title}} could not be reposted: {{failure_reason}}\n\nAuto-repost has been disabled. Dashboard: {{dashboard_url}}`,
  },

  // ── 19. Employer: new application notification ──────────────────────────────
  new_application_notification: {
    subject: "New application — {{job_title}}",
    html: BASE_HTML(`
      <h1>New application received 📬</h1>
      <p>Hi {{employer_name}},</p>
      <p>A student has applied for <strong>{{job_title}}</strong>.</p>
      <div class="info-box">
        <p><strong>Applicant:</strong> {{student_name}}</p>
        <p><strong>Applied:</strong> {{applied_date}}</p>
      </div>
      <a href="{{application_url}}" class="btn">Review Application</a>
    `, "A new student has applied for your job"),
    text: `New application\n\nHi {{employer_name}},\n\n{{student_name}} applied for {{job_title}} on {{applied_date}}.\n\nReview: {{application_url}}`,
  },

  // ── 20. Employer: placement request received ─────────────────────────────────
  placement_request_received: {
    subject: "Work placement request — {{school_name}}",
    html: BASE_HTML(`
      <h1>Work placement request received</h1>
      <p>Hi {{employer_name}},</p>
      <p><strong>{{school_name}}</strong> has submitted a work placement request for one of their students.</p>
      <div class="info-box">
        <p><strong>Student:</strong> {{student_name}}</p>
        <p><strong>Dates:</strong> {{placement_start}} – {{placement_end}}</p>
        <p><strong>Hours/week:</strong> {{hours_per_week}}</p>
        <p><strong>Notes:</strong> {{notes}}</p>
      </div>
      <a href="{{respond_url}}" class="btn">Approve or Decline</a>
    `, "A school has requested a work placement with your business"),
    text: `Placement request\n\nHi {{employer_name}},\n\n{{school_name}} requested a placement for {{student_name}}\nDates: {{placement_start}} to {{placement_end}}\nHours/week: {{hours_per_week}}\nNotes: {{notes}}\n\nRespond: {{respond_url}}`,
  },

  // ── 21. Employer: placement approved by school or student ────────────────────
  placement_approved_by_school_or_student: {
    subject: "Placement update — {{student_name}}",
    html: BASE_HTML(`
      <h1>Placement update</h1>
      <p>Hi {{employer_name}},</p>
      <p>The placement for <strong>{{student_name}}</strong> has been <strong>signed by {{signed_by}}</strong>.</p>
      <div class="info-box">
        <p><strong>Status:</strong> <span class="badge">{{status_label}}</span></p>
        <p><strong>Remaining signatures:</strong> {{remaining_signatures}}</p>
      </div>
      <a href="{{placement_url}}" class="btn">View Placement</a>
    `, "A placement has been updated"),
    text: `Placement update\n\nHi {{employer_name}},\n\n{{student_name}}'s placement was signed by {{signed_by}}.\nStatus: {{status_label}}\nRemaining signatures: {{remaining_signatures}}\n\nView: {{placement_url}}`,
  },

  // ── 22. Employer: payment received (Phase 3) ─────────────────────────────────
  payment_received: {
    subject: "Payment received — {{job_title}}",
    html: BASE_HTML(`
      <h1>Payment received 💰</h1>
      <p>Hi {{employer_name}},</p>
      <p>Payment for the placement of <strong>{{student_name}}</strong> in <strong>{{job_title}}</strong> was successful.</p>
      <div class="info-box">
        <p><strong>Amount:</strong> {{amount_aud}} AUD</p>
        <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
      </div>
    `, "Payment received for a JutJut placement"),
    text: `Payment received\n\nHi {{employer_name}},\n\nPayment for {{student_name}} in {{job_title}}: {{amount_aud}} AUD\nTransaction: {{transaction_id}}`,
  },

  // ── 23. Employer: payment declined (Phase 3) ─────────────────────────────────
  payment_declined: {
    subject: "⚠️ Payment failed — {{job_title}}",
    html: BASE_HTML(`
      <h1>Payment failed ⚠️</h1>
      <p>Hi {{employer_name}},</p>
      <p>The payment for the placement of <strong>{{student_name}}</strong> in <strong>{{job_title}}</strong> was declined.</p>
      <p>Please update your payment method and try again.</p>
      <a href="{{dashboard_url}}" class="btn">Update Payment Method</a>
    `, "A JutJut payment was declined"),
    text: `Payment failed\n\nHi {{employer_name}},\n\nPayment for {{student_name}} in {{job_title}} was declined.\n\nUpdate payment: {{dashboard_url}}`,
  },

  // ── 24. School: request autoreply ────────────────────────────────────────────
  school_request_autoreply: {
    subject: "We received your school request — JutJut",
    html: BASE_HTML(`
      <h1>Request received 📋</h1>
      <p>Hi {{contact_name}},</p>
      <p>Thanks for submitting a request to join JutJut as a school partner. We'll review your application and get back to you within <strong>2 business days</strong>.</p>
      <div class="info-box">
        <p><strong>School:</strong> {{school_name}}</p>
        <p><strong>Contact:</strong> {{contact_email}}</p>
        <p><strong>Submitted:</strong> {{submitted_date}}</p>
      </div>
      <p>Questions? Reply to this email or contact <a href="mailto:schools@jutjut.com.au">schools@jutjut.com.au</a>.</p>
    `, "We received your school request"),
    text: `Request received\n\nHi {{contact_name}},\n\nWe received your request for {{school_name}}. We'll review within 2 business days.\n\nQuestions: schools@jutjut.com.au`,
  },

  // ── 25. School: approved ─────────────────────────────────────────────────────
  school_approved: {
    subject: "🎉 Your school has been approved — JutJut",
    html: BASE_HTML(`
      <h1>Welcome to JutJut for Schools! 🎉</h1>
      <p>Hi {{contact_name}},</p>
      <p>Great news — <strong>{{school_name}}</strong> has been approved as a JutJut school partner.</p>
      <p>You can now access the School Dashboard to manage students, view employer profiles, and coordinate work placements.</p>
      <a href="{{dashboard_url}}" class="btn">Access School Dashboard</a>
    `, "Your school has been approved on JutJut"),
    text: `School approved!\n\nHi {{contact_name}},\n\n{{school_name}} has been approved.\n\nAccess your dashboard: {{dashboard_url}}`,
  },

  // ── 26. School: rejected ─────────────────────────────────────────────────────
  school_rejected: {
    subject: "Update on your JutJut school request",
    html: BASE_HTML(`
      <h1>Update on your request</h1>
      <p>Hi {{contact_name}},</p>
      <p>Thank you for your interest in JutJut. After reviewing your application for <strong>{{school_name}}</strong>, we're unable to approve it at this time.</p>
      <p>{{rejection_reason}}</p>
      <p>If you believe this is an error or have questions, please contact <a href="mailto:schools@jutjut.com.au">schools@jutjut.com.au</a>.</p>
    `, "Update on your JutJut school request"),
    text: `Update on your request\n\nHi {{contact_name}},\n\nWe're unable to approve {{school_name}} at this time.\n\n{{rejection_reason}}\n\nContact: schools@jutjut.com.au`,
  },

  // ── 27. School: placement request confirmation ───────────────────────────────
  school_placement_request_confirmation: {
    subject: "Placement request submitted — {{student_name}}",
    html: BASE_HTML(`
      <h1>Placement request submitted</h1>
      <p>Hi {{contact_name}},</p>
      <p>The placement request for <strong>{{student_name}}</strong> with <strong>{{employer_name}}</strong> has been submitted and is awaiting employer response.</p>
      <div class="info-box">
        <p><strong>Student:</strong> {{student_name}}</p>
        <p><strong>Employer:</strong> {{employer_name}}</p>
        <p><strong>Dates:</strong> {{placement_start}} – {{placement_end}}</p>
      </div>
      <a href="{{placements_url}}" class="btn">View Placements</a>
    `, "A placement request has been submitted"),
    text: `Placement submitted\n\nHi {{contact_name}},\n\nPlacement for {{student_name}} with {{employer_name}}: {{placement_start}} to {{placement_end}}\n\nView: {{placements_url}}`,
  },

  // ── 28. School: placement status update ─────────────────────────────────────
  school_placement_status_update: {
    subject: "Placement update — {{student_name}} at {{employer_name}}",
    html: BASE_HTML(`
      <h1>Placement update</h1>
      <p>Hi {{contact_name}},</p>
      <p>The placement for <strong>{{student_name}}</strong> at <strong>{{employer_name}}</strong> has been updated.</p>
      <div class="info-box"><p><span class="badge {{status_badge_class}}">{{status_label}}</span> &nbsp;{{status_message}}</p></div>
      <a href="{{placements_url}}" class="btn">View Placement</a>
    `, "A work placement has been updated"),
    text: `Placement update\n\nHi {{contact_name}},\n\n{{student_name}} at {{employer_name}}: {{status_label}}\n{{status_message}}\n\nView: {{placements_url}}`,
  },

  // ── 29. School: placement completed summary ──────────────────────────────────
  school_placement_completed_summary: {
    subject: "Placement completed — {{student_name}}",
    html: BASE_HTML(`
      <h1>Placement completed ✅</h1>
      <p>Hi {{contact_name}},</p>
      <p>The work placement for <strong>{{student_name}}</strong> at <strong>{{employer_name}}</strong> has been completed and all parties have signed.</p>
      <div class="info-box">
        <p><strong>Student:</strong> {{student_name}}</p>
        <p><strong>Employer:</strong> {{employer_name}}</p>
        <p><strong>Dates:</strong> {{placement_start}} – {{placement_end}}</p>
        <p><strong>Total hours:</strong> {{total_hours}}</p>
      </div>
      <a href="{{summary_url}}" class="btn">View Summary</a>
    `, "A work placement has been completed"),
    text: `Placement completed\n\nHi {{contact_name}},\n\n{{student_name}} at {{employer_name}}: {{placement_start}} to {{placement_end}}, {{total_hours}} hours total.\n\nView summary: {{summary_url}}`,
  },

  // ── 30. School: daily digest (opt-in) ───────────────────────────────────────
  school_daily_digest: {
    subject: "JutJut school digest — {{digest_date}}",
    isMarketing: true,
    html: BASE_HTML(`
      <h1>Your school digest 📊</h1>
      <p>Hi {{contact_name}},</p>
      <p>Here's your daily summary for <strong>{{school_name}}</strong>:</p>
      <div class="info-box">
        <p><strong>New student signups:</strong> {{new_signups}}</p>
        <p><strong>Active placements:</strong> {{active_placements}}</p>
        <p><strong>Pending placement responses:</strong> {{pending_placements}}</p>
      </div>
      <a href="{{dashboard_url}}" class="btn">Go to Dashboard</a>
    `, "Your daily JutJut school digest"),
    text: `School digest — {{digest_date}}\n\nHi {{contact_name}},\n\nNew signups: {{new_signups}}\nActive placements: {{active_placements}}\nPending responses: {{pending_placements}}\n\nDashboard: {{dashboard_url}}`,
  },

  // ── 31. Admin: new school request ───────────────────────────────────────────
  admin_new_school_request: {
    subject: "🏫 New school request — {{school_name}}",
    html: BASE_HTML(`
      <h1>New school request</h1>
      <p>A new school has submitted a registration request.</p>
      <div class="info-box">
        <p><strong>School:</strong> {{school_name}}</p>
        <p><strong>Contact:</strong> {{contact_name}} ({{contact_email}})</p>
        <p><strong>State:</strong> {{school_state}}</p>
        <p><strong>Submitted:</strong> {{submitted_date}}</p>
      </div>
      <a href="{{admin_url}}" class="btn">Review in Admin Dashboard</a>
    `, "A new school has submitted a request"),
    text: `New school request\n\nSchool: {{school_name}}\nContact: {{contact_name}} ({{contact_email}})\nState: {{school_state}}\nSubmitted: {{submitted_date}}\n\nReview: {{admin_url}}`,
  },

  // ── 32. Admin: new drop submission ──────────────────────────────────────────
  admin_new_drop_submission: {
    subject: "🎁 New Drop submission — {{drop_title}}",
    html: BASE_HTML(`
      <h1>New Drop submission</h1>
      <p>A new Drop has been submitted for approval.</p>
      <div class="info-box">
        <p><strong>Title:</strong> {{drop_title}}</p>
        <p><strong>Business:</strong> {{business_name}}</p>
        <p><strong>Scheduled:</strong> {{scheduled_date}}</p>
      </div>
      <a href="{{admin_url}}" class="btn">Review in Admin Dashboard</a>
    `, "A new Drop has been submitted for approval"),
    text: `New Drop submission\n\nTitle: {{drop_title}}\nBusiness: {{business_name}}\nScheduled: {{scheduled_date}}\n\nReview: {{admin_url}}`,
  },

  // ── 33. Admin: daily summary ─────────────────────────────────────────────────
  admin_daily_summary: {
    subject: "JutJut admin daily summary — {{summary_date}}",
    html: BASE_HTML(`
      <h1>Daily admin summary 📈</h1>
      <p>Here's your summary for <strong>{{summary_date}}</strong>:</p>
      <div class="info-box">
        <p><strong>Pending school requests:</strong> {{pending_schools}}</p>
        <p><strong>Pending Drop approvals:</strong> {{pending_drops}}</p>
        <p><strong>Flagged jobs:</strong> {{flagged_jobs}}</p>
        <p><strong>Low-credit employers:</strong> {{low_credit_employers}}</p>
        <p><strong>New waitlist signups (24h):</strong> {{new_waitlist}}</p>
        <p><strong>New student signups (24h):</strong> {{new_students}}</p>
      </div>
      <a href="{{admin_url}}" class="btn">Open Admin Dashboard</a>
    `, "Your JutJut daily admin summary"),
    text: `Admin daily summary — {{summary_date}}\n\nPending schools: {{pending_schools}}\nPending drops: {{pending_drops}}\nFlagged jobs: {{flagged_jobs}}\nLow-credit employers: {{low_credit_employers}}\nNew waitlist signups: {{new_waitlist}}\nNew students: {{new_students}}\n\nDashboard: {{admin_url}}`,
  },

  // ── 34. Admin: SES error alert ───────────────────────────────────────────────
  admin_ses_error: {
    subject: "⚠️ SES sending error — {{error_type}}",
    html: BASE_HTML(`
      <h1>SES sending error ⚠️</h1>
      <p>An email sending error was recorded:</p>
      <div class="info-box">
        <p><strong>Type:</strong> {{error_type}}</p>
        <p><strong>To:</strong> {{to_email}}</p>
        <p><strong>Template:</strong> {{template_id}}</p>
        <p><strong>Message:</strong> {{error_message}}</p>
        <p><strong>Time:</strong> {{error_time}}</p>
      </div>
      <a href="{{admin_url}}" class="btn">View Email Logs</a>
    `, "A JutJut SES sending error occurred"),
    text: `SES error\n\nType: {{error_type}}\nTo: {{to_email}}\nTemplate: {{template_id}}\nMessage: {{error_message}}\nTime: {{error_time}}\n\nLogs: {{admin_url}}`,
  },

  // ── 35. Teacher/Coach: verification request ──────────────────────────────────
  verification_request: {
    subject: "{{student_name}} has requested your endorsement — JutJut",
    html: BASE_HTML(`
      <h1>Skill endorsement request</h1>
      <p>Hi {{voucher_name}},</p>
      <p><strong>{{student_name}}</strong> has listed you as a reference for the following skill on their JutJut profile:</p>
      <div class="info-box"><p><strong>{{skill_name}}</strong></p></div>
      <p>JutJut is a free platform that helps Australian students showcase their skills to employers. Your endorsement helps {{student_name}} stand out.</p>
      <p>No account is required — simply click the button below to verify or decline.</p>
      <a href="{{verify_url}}" class="btn">Verify This Skill</a>
      <a href="{{decline_url}}" style="display:inline-block;margin-left:12px;color:#6b7280;font-size:14px;">Decline</a>
      <p style="font-size:13px;color:#6b7280;margin-top:16px;">This link expires in 7 days. If you have questions, contact <a href="mailto:hello@jutjut.com.au">hello@jutjut.com.au</a>.</p>
    `, "A student has requested your skill endorsement"),
    text: `Skill endorsement request\n\nHi {{voucher_name}},\n\n{{student_name}} has requested your endorsement for: {{skill_name}}\n\nVerify: {{verify_url}}\nDecline: {{decline_url}}\n\nExpires in 7 days.`,
  },
};

// ─── Render function ──────────────────────────────────────────────────────────

export type RenderEmailResult = {
  html: string;
  text: string;
  subject: string;
  isMarketing: boolean;
};

/**
 * Render an email template with the given data.
 * All {{placeholder}} tokens in both HTML and text are replaced.
 */
export function renderEmail(
  templateId: string,
  data: Record<string, string>,
  unsubscribeUrl?: string
): RenderEmailResult {
  const tpl = TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown email template: ${templateId}`);

  const isMarketing = tpl.isMarketing ?? false;

  // Build the full data map including unsubscribe block
  const fullData: Record<string, string> = {
    ...data,
    unsubscribe_url: unsubscribeUrl ?? "#",
    unsubscribe_block: isMarketing
      ? MARKETING_FOOTER.replace("{{unsubscribe_url}}", unsubscribeUrl ?? "#")
      : TRANSACTIONAL_FOOTER,
  };

  const replace = (str: string) =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => fullData[key] ?? `{{${key}}}`);

  return {
    html: replace(tpl.html),
    text: replace(tpl.text),
    subject: replace(tpl.subject),
    isMarketing,
  };
}

export { TEMPLATES };
