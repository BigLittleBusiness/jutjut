/**
 * QR Code Redemption REST handlers
 *
 * GET  /api/redeem/:token  — server-rendered co-branded HTML page for staff
 * POST /api/redeem/:token  — mark a token as redeemed (idempotent)
 *
 * These are intentionally REST (not tRPC) so staff can open the URL on any
 * device without needing a JutJut account or session cookie.
 */
import type { Request, Response } from "express";
import { getDb } from "./db";
import { dropRedemptionTokens, dropClaims, drops, users, userProfiles, schoolStudents, schools, employers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./_core/logger";

// ─── HTML page builder ────────────────────────────────────────────────────────

const JUTJUT_LOGO_URL = "https://jutjut.com.au/logo.png";

function buildPage(opts: {
  state: "valid" | "expired" | "redeemed" | "invalid";
  dropTitle?: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  studentFirstName?: string;
  studentSurnameInitial?: string;
  school?: string | null;
  yearLevel?: string | null;
  redeemedAt?: Date | null;
}) {
  const {
    state,
    dropTitle = "JutJut Drop",
    businessName = "JutJut Partner",
    businessLogoUrl,
    studentFirstName = "",
    studentSurnameInitial = "",
    school,
    yearLevel,
    redeemedAt,
  } = opts;

  const stateConfig = {
    valid: {
      colour: "#10b981",
      icon: "✓",
      heading: "Valid — Ready to Redeem",
      subtext: "Show this screen to the staff member and ask them to tap Confirm below.",
    },
    expired: {
      colour: "#f59e0b",
      icon: "⏱",
      heading: "QR Code Expired",
      subtext: "This QR code has expired. Ask the student to open JutJut and generate a new code.",
    },
    redeemed: {
      colour: "#6366f1",
      icon: "✓✓",
      heading: "Already Redeemed",
      subtext: redeemedAt
        ? `This offer was redeemed on ${redeemedAt.toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}.`
        : "This offer has already been redeemed.",
    },
    invalid: {
      colour: "#ef4444",
      icon: "✗",
      heading: "Invalid Code",
      subtext: "This QR code is not recognised. Please check the code and try again.",
    },
  };

  const cfg = stateConfig[state];

  const studentInfo =
    state === "valid" && studentFirstName
      ? `<div class="student-card">
          <div class="student-name">${studentFirstName} ${studentSurnameInitial}.</div>
          ${school ? `<div class="student-meta">${school}</div>` : ""}
          ${yearLevel ? `<div class="student-meta">${yearLevel}</div>` : ""}
        </div>`
      : "";

  const confirmButton =
    state === "valid"
      ? `<form method="POST" style="margin-top:1.5rem;">
          <button type="submit" class="confirm-btn">Confirm Redemption</button>
        </form>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JutJut Drop — ${dropTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      max-width: 420px;
      width: 100%;
      padding: 2rem 1.5rem;
      text-align: center;
    }
    .logos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .logos img {
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
    }
    .logos .divider {
      color: #cbd5e1;
      font-size: 1.5rem;
      font-weight: 300;
    }
    .state-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
      color: ${cfg.colour};
    }
    .offer-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .state-heading {
      font-size: 1rem;
      font-weight: 600;
      color: ${cfg.colour};
      margin-bottom: 0.5rem;
    }
    .state-subtext {
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.5;
    }
    .student-card {
      background: #f1f5f9;
      border-radius: 0.75rem;
      padding: 1rem;
      margin-top: 1.25rem;
    }
    .student-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
    }
    .student-meta {
      font-size: 0.875rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    .confirm-btn {
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      padding: 0.875rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;
    }
    .confirm-btn:hover { background: #059669; }
    .confirm-btn:active { transform: scale(0.98); }
    .footer-note {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logos">
      <img src="${JUTJUT_LOGO_URL}" alt="JutJut" onerror="this.style.display='none'" />
      ${businessLogoUrl ? `<span class="divider">×</span><img src="${businessLogoUrl}" alt="${businessName}" onerror="this.style.display='none'" />` : ""}
    </div>
    <div class="offer-title">${dropTitle}</div>
    <div class="state-icon">${cfg.icon}</div>
    <div class="state-heading">${cfg.heading}</div>
    <div class="state-subtext">${cfg.subtext}</div>
    ${studentInfo}
    ${confirmButton}
    <div class="footer-note">Powered by JutJut · jutjut.com.au</div>
  </div>
</body>
</html>`;
}

// ─── GET /api/redeem/:token ───────────────────────────────────────────────────

export async function handleGetRedeem(req: Request, res: Response) {
  const { token } = req.params;

  if (!token || typeof token !== "string") {
    return res.status(400).send(buildPage({ state: "invalid" }));
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).send(buildPage({ state: "invalid" }));
    }

    // Fetch token row
    const tokenRows = await db
      .select()
      .from(dropRedemptionTokens)
      .where(eq(dropRedemptionTokens.token, token))
      .limit(1);

    if (tokenRows.length === 0) {
      return res.status(404).send(buildPage({ state: "invalid" }));
    }

    const tokenRow = tokenRows[0];

    // Fetch drop + business info
    const dropRows = await db
      .select()
      .from(drops)
      .where(eq(drops.id, tokenRow.dropId))
      .limit(1);
    const drop = dropRows[0];

    const dropTitle = drop?.title ?? "JutJut Drop";

    // Fetch employer logo for co-branding
    let businessLogoUrl: string | null = null;
    let businessName = "JutJut Partner";
    if (drop?.businessId) {
      const empRows = await db
        .select({ logoUrl: employers.logoUrl, businessName: employers.businessName })
        .from(employers)
        .where(eq(employers.userId, drop.businessId))
        .limit(1);
      businessLogoUrl = empRows[0]?.logoUrl ?? null;
      businessName = empRows[0]?.businessName ?? "JutJut Partner";
    }

    // Fetch student info
    const studentRows = await db
      .select({ name: users.name, yearLevel: users.yearLevel })
      .from(users)
      .where(eq(users.id, tokenRow.userId))
      .limit(1);
    const student = studentRows[0];

    // Parse name into first name + initial
    const nameParts = (student?.name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const surnameInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : "";

    // Fetch school
    const schoolRows = await db
      .select({ schoolName: schools.name })
      .from(schoolStudents)
      .innerJoin(schools, eq(schools.id, schoolStudents.schoolId))
      .where(eq(schoolStudents.studentId, tokenRow.userId))
      .limit(1);
    const schoolName = schoolRows[0]?.schoolName ?? null;

    // Determine state
    if (tokenRow.redeemedAt) {
      return res.send(
        buildPage({
          state: "redeemed",
          dropTitle,
          businessLogoUrl,
          redeemedAt: tokenRow.redeemedAt,
        })
      );
    }

    if (new Date() > tokenRow.expiresAt) {
      return res.send(buildPage({ state: "expired", dropTitle, businessLogoUrl }));
    }

    // Valid — show student info for staff
    return res.send(
      buildPage({
        state: "valid",
        dropTitle,
        businessLogoUrl,
        studentFirstName: firstName,
        studentSurnameInitial: surnameInitial,
        school: schoolName,
        yearLevel: student?.yearLevel ?? null,
      })
    );
  } catch (err) {
    logger.error({ err }, "[redeemHandler] GET error");
    return res.status(500).send(buildPage({ state: "invalid" }));
  }
}

// ─── POST /api/redeem/:token ──────────────────────────────────────────────────

export async function handlePostRedeem(req: Request, res: Response) {
  const { token } = req.params;
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Invalid token." });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Service unavailable." });
    }

    const tokenRows = await db
      .select()
      .from(dropRedemptionTokens)
      .where(eq(dropRedemptionTokens.token, token))
      .limit(1);

    if (tokenRows.length === 0) {
      return res.status(404).json({ error: "Token not found." });
    }

    const tokenRow = tokenRows[0];

    // Idempotent — already redeemed
    if (tokenRow.redeemedAt) {
      return res.json({ success: true, alreadyRedeemed: true });
    }

    // Expired
    if (new Date() > tokenRow.expiresAt) {
      return res.status(410).json({ error: "Token expired." });
    }

    const now = new Date();

    // Mark token as redeemed
    await db
      .update(dropRedemptionTokens)
      .set({ redeemedAt: now, redeemedByIp: clientIp })
      .where(eq(dropRedemptionTokens.id, tokenRow.id));

    // Update the claim row
    await db
      .update(dropClaims)
      .set({ redeemedAt: now, redemptionTokenId: tokenRow.id })
      .where(eq(dropClaims.id, tokenRow.claimId));

    logger.info(
      { tokenId: tokenRow.id, dropId: tokenRow.dropId, userId: tokenRow.userId },
      "[redeemHandler] Token redeemed"
    );

    // Return the updated page HTML for the form POST redirect
    const dropRows = await db
      .select({ title: drops.title })
      .from(drops)
      .where(eq(drops.id, tokenRow.dropId))
      .limit(1);
    const dropTitle = dropRows[0]?.title ?? "JutJut Drop";

    return res.send(buildPage({ state: "redeemed", dropTitle, redeemedAt: now }));
  } catch (err) {
    logger.error({ err }, "[redeemHandler] POST error");
    return res.status(500).json({ error: "Internal server error." });
  }
}
