import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from './_core/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        // Connection pool settings for AWS RDS
        connectionLimit: 10,
        queueLimit: 0,
        waitForConnections: true,
        connectTimeout: 10_000,
        // SSL for RDS (required in production; skipped in dev/TiDB Cloud which uses its own TLS)
        ...(ENV.isProduction
          ? { ssl: { rejectUnauthorized: true } }
          : {}),
      });
      _db = drizzle(_pool);
    } catch (error) {
      logger.warn({ err: error }, "[Database] Failed to connect");
      _db = null;
      _pool = null;
    }
  }
  return _db as ReturnType<typeof drizzle> | null;
}

/**
 * assertDb — returns the DB instance or throws a typed TRPCError.
 * Use this in tRPC procedures instead of silent `if (!db) return` guards.
 */
export async function assertDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database connection unavailable",
    });
  }
  return db;
}

/**
 * closeDb — drains the connection pool gracefully.
 * Called during SIGTERM/SIGINT shutdown.
 */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    logger.info("[Database] Connection pool closed");
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
      logger.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    logger.error({ err: error }, "[Database] Failed to upsert user");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ─── Employer helpers ─────────────────────────────────────────────────────────

import {
  employers,
  employerCredits,
  creditTransactions,
  promoCodes,
  promoRedemptions,
  jobs,
  jobViews,
  jobApplications,
  placements,
  credentials,
  schoolStudents,
  schools,
  dropViews,
  drops,
  dropClaims,
  waitlistSignups,
  WaitlistSignup,
} from "../drizzle/schema";
import { and, lte, desc, sql, count, avg, isNotNull, inArray } from "drizzle-orm";

export async function getEmployerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(employers).where(eq(employers.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getEmployerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertEmployer(data: {
  userId: number;
  businessName: string;
  abn?: string | null;
  contactEmail?: string | null;
  isGstRegistered?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getEmployerByUserId(data.userId);
  if (existing) {
    await db.update(employers).set({ ...data, updatedAt: new Date() }).where(eq(employers.userId, data.userId));
    return getEmployerByUserId(data.userId);
  }
  await db.insert(employers).values({ ...data, createdAt: new Date(), updatedAt: new Date() });
  const emp = await getEmployerByUserId(data.userId);
  if (emp) {
    await db
      .insert(employerCredits)
      .values({ employerId: emp.id, creditBalance: 0 })
      .onDuplicateKeyUpdate({ set: { employerId: emp.id } });
  }
  return emp;
}

export async function setEmployerPaymentToken(employerId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employers).set({ paymentToken: token, updatedAt: new Date() }).where(eq(employers.id, employerId));
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export async function getCreditBalance(employerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(employerCredits).where(eq(employerCredits.employerId, employerId)).limit(1);
  return rows[0]?.creditBalance ?? 0;
}

export async function adjustCredits(params: {
  employerId: number;
  amount: number;
  type: "purchase" | "job_post" | "refund" | "promo_bonus" | "auto_repost";
  reference?: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(employerCredits)
    .values({ employerId: params.employerId, creditBalance: params.amount })
    .onDuplicateKeyUpdate({
      set: {
        creditBalance: sql`credit_balance + ${params.amount}`,
        updatedAt: sql`now()`,
      },
    });
  await db.insert(creditTransactions).values({
    employerId: params.employerId,
    amount: params.amount,
    type: params.type,
    reference: params.reference ?? null,
    description: params.description ?? null,
    createdAt: new Date(),
  });
}

export async function getTransactionHistory(employerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.employerId, employerId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

// ─── Promo Codes ─────────────────────────────────────────────────────────────

export async function getPromoCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, code.toUpperCase()), eq(promoCodes.isActive, true)))
    .limit(1);
  const promo = rows[0] ?? null;
  if (!promo) return null;
  // Check expiry
  if (promo.expiresAt && promo.expiresAt < now) return null;
  // Check max uses
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return null;
  return promo;
}

export async function incrementPromoCodeUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes).set({ usedCount: sql`used_count + 1` }).where(eq(promoCodes.id, id));
}

export async function getAllPromoCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function createPromoCode(data: {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  bonusCredits?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(promoCodes).values({
    ...data,
    code: data.code.toUpperCase(),
    bonusCredits: data.bonusCredits ?? 0,
    maxUses: data.maxUses ?? null,
    expiresAt: data.expiresAt ?? null,
    usedCount: 0,
    isActive: true,
    createdAt: new Date(),
  });
}

export async function updatePromoCode(id: number, data: { isActive?: boolean; maxUses?: number | null; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoCodes).set(data).where(eq(promoCodes.id, id));
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJobsByPostedUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.postedByUserId, userId)).orderBy(desc(jobs.createdAt));
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function recordJobView(jobId: number, viewerUserId?: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.insert(jobViews).values({ jobId, viewerUserId: viewerUserId ?? null, viewedAt: new Date() });
  await db.update(jobs).set({ viewCount: sql`view_count + 1` }).where(eq(jobs.id, jobId));
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getJobAnalyticsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const employerJobs = await getJobsByPostedUser(userId);
  return employerJobs.map(j => ({
    jobId: j.id,
    title: j.title,
    viewCount: j.viewCount,
    applyCount: j.applyCount,
    isActive: j.isActive,
    isFeatured: j.isFeatured,
    createdAt: j.createdAt,
    expiresAt: j.expiresAt,
  }));
}

// ─── Auto-repost ──────────────────────────────────────────────────────────────

export async function getAutoRepostCandidates() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(jobs)
    .where(and(eq(jobs.autoRepostEnabled, true), lte(jobs.autoRepostNextDate, now)));
}

// ─── Promo Redemption History ─────────────────────────────────────────────────

export async function recordPromoRedemption(data: {
  promoCodeId: number;
  promoCode: string;
  redeemedByUserId?: number | null;
  redeemedByEmployerId?: number | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
  bonusCreditsAwarded?: number;
  chargeToken?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(promoRedemptions).values({
    promoCodeId: data.promoCodeId,
    promoCode: data.promoCode.toUpperCase(),
    redeemedByUserId: data.redeemedByUserId ?? null,
    redeemedByEmployerId: data.redeemedByEmployerId ?? null,
    discountType: data.discountType,
    discountValue: data.discountValue,
    bonusCreditsAwarded: data.bonusCreditsAwarded ?? 0,
    chargeToken: data.chargeToken ?? null,
    redeemedAt: new Date(),
  });
}

export async function getPromoCodeRedemptions(promoCodeId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join with users to get name/email for the detail view
  const rows = await db
    .select({
      id: promoRedemptions.id,
      promoCode: promoRedemptions.promoCode,
      redeemedByUserId: promoRedemptions.redeemedByUserId,
      redeemedByEmployerId: promoRedemptions.redeemedByEmployerId,
      discountType: promoRedemptions.discountType,
      discountValue: promoRedemptions.discountValue,
      bonusCreditsAwarded: promoRedemptions.bonusCreditsAwarded,
      chargeToken: promoRedemptions.chargeToken,
      redeemedAt: promoRedemptions.redeemedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(promoRedemptions)
    .leftJoin(users, eq(promoRedemptions.redeemedByUserId, users.id))
    .where(eq(promoRedemptions.promoCodeId, promoCodeId))
    .orderBy(desc(promoRedemptions.redeemedAt));
  return rows;
}

// ─── Waitlist Signups ─────────────────────────────────────────────────────────


export async function addWaitlistSignup(data: {
  email: string;
  firstName?: string | null;
  role?: "student" | "employer" | "other";
  school?: string | null;
  source?: string;
  ipAddress?: string | null;
}): Promise<{ success: boolean; duplicate: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, duplicate: false };

  // Check for duplicate email first
  const existing = await db
    .select({ id: waitlistSignups.id })
    .from(waitlistSignups)
    .where(eq(waitlistSignups.email, data.email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, duplicate: true };
  }

  await db.insert(waitlistSignups).values({
    email: data.email.toLowerCase().trim(),
    firstName: data.firstName ?? null,
    role: data.role ?? "student",
    school: data.school ?? null,
    source: data.source ?? "landing_page",
    ipAddress: data.ipAddress ?? null,
    confirmed: false,
  });

  return { success: true, duplicate: false };
}

export async function getAllWaitlistSignups(): Promise<WaitlistSignup[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(waitlistSignups)
    .orderBy(desc(waitlistSignups.createdAt));
}

export async function getWaitlistCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: waitlistSignups.id })
    .from(waitlistSignups);
  return rows.length;
}

// ─── Job Applications ─────────────────────────────────────────────────────────

export async function applyToJob(params: {
  jobId: number;
  userId: number;
  coverLetter?: string | null;
  contactSharedAtApplication: boolean;
}): Promise<{ success: boolean; alreadyApplied: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check for duplicate application
  const existing = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, params.jobId), eq(jobApplications.userId, params.userId)))
    .limit(1);
  if (existing.length > 0) return { success: false, alreadyApplied: true };
  await db.insert(jobApplications).values({
    jobId: params.jobId,
    userId: params.userId,
    coverLetter: params.coverLetter ?? null,
    contactSharedAtApplication: params.contactSharedAtApplication,
    status: "applied",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  // Increment apply count on job
  await db.update(jobs).set({ applyCount: sql`apply_count + 1` }).where(eq(jobs.id, params.jobId));
  return { success: true, alreadyApplied: false };
}

// ─── Hirer Analytics Detail ───────────────────────────────────────────────────

export async function getJobAnalyticsDetail(jobId: number, employerUserId: number) {
  const db = await getDb();
  if (!db) return null;

  // Verify ownership
  const job = await getJobById(jobId);
  if (!job || job.postedByUserId !== employerUserId) return null;

  // Fetch all applications for this job
  const apps = await db
    .select({
      id: jobApplications.id,
      userId: jobApplications.userId,
      coverLetter: jobApplications.coverLetter,
      status: jobApplications.status,
      contactShared: jobApplications.contactSharedAtApplication,
      appliedAt: jobApplications.createdAt,
    })
    .from(jobApplications)
    .where(eq(jobApplications.jobId, jobId))
    .orderBy(desc(jobApplications.createdAt));

  // Fetch user details for applicants
  const userIds = apps.map(a => a.userId);
  const userRows = userIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u]));

  // Fetch credential counts per applicant
  const credRows = userIds.length > 0
    ? await db
        .select({ userId: credentials.userId, cnt: count(credentials.id) })
        .from(credentials)
        .where(inArray(credentials.userId, userIds))
        .groupBy(credentials.userId)
    : [];
  const credMap = new Map(credRows.map(r => [r.userId, r.cnt]));

  // Fetch hire count (placements linked to this job with completed or approved status)
  const hireRows = await db
    .select({ id: placements.id })
    .from(placements)
    .where(and(eq(placements.jobId, jobId), inArray(placements.status, ["completed", "approved_by_school"])));
  const hireCount = hireRows.length;

  // Build applicant list with privacy rules
  const applicants = apps.map(a => {
    const u = userMap.get(a.userId);
    return {
      studentId: a.contactShared ? a.userId : null,
      name: a.contactShared ? (u?.name ?? null) : null,
      email: a.contactShared ? (u?.email ?? null) : null,
      verifiedSkillCount: credMap.get(a.userId) ?? 0,
      appliedAt: a.appliedAt,
      contactShared: a.contactShared,
      status: a.status,
    };
  });

  // School breakdown — join applicant users to schoolStudents → schools
  const schoolRows = userIds.length > 0
    ? await db
        .select({ schoolName: schools.name, userId: schoolStudents.studentId })
        .from(schoolStudents)
        .innerJoin(schools, eq(schools.id, schoolStudents.schoolId))
        .where(inArray(schoolStudents.studentId, userIds))
    : [];
  const schoolMap = new Map(schoolRows.map(r => [r.userId, r.schoolName]));
  const schoolCounts: Record<string, number> = {};
  for (const a of apps) {
    const sn = schoolMap.get(a.userId) ?? "Other";
    schoolCounts[sn] = (schoolCounts[sn] ?? 0) + 1;
  }
  const schoolBreakdown = Object.entries(schoolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([schoolName, count]) => ({ schoolName, count }));

  // Applications over time (by day)
  const dayMap: Record<string, number> = {};
  for (const a of apps) {
    const day = a.appliedAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }
  const applicationsOverTime = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Derived metrics
  const conversionRate = job.viewCount > 0 ? (apps.length / job.viewCount) * 100 : 0;
  const avgApplicantSkillCount = apps.length > 0
    ? apps.reduce((sum, a) => sum + (credMap.get(a.userId) ?? 0), 0) / apps.length
    : 0;
  const firstApp = apps.length > 0 ? apps[apps.length - 1] : null; // oldest first
  const timeToFirstApplicationHours = firstApp
    ? (firstApp.appliedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60)
    : null;

  return {
    job: {
      id: job.id,
      title: job.title,
      views: job.viewCount,
      applies: apps.length,
      hires: hireCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgApplicantSkillCount: Math.round(avgApplicantSkillCount * 10) / 10,
      timeToFirstApplicationHours: timeToFirstApplicationHours !== null
        ? Math.round(timeToFirstApplicationHours * 10) / 10
        : null,
    },
    applicants,
    schoolBreakdown,
    applicationsOverTime,
  };
}

// ─── Drop Views & Analytics ───────────────────────────────────────────────────

export async function recordDropView(params: {
  dropId: number;
  studentId?: number | null;
  sessionId?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  // Deduplicate: skip if already viewed by this student or session
  if (params.studentId) {
    const existing = await db
      .select({ id: dropViews.id })
      .from(dropViews)
      .where(and(eq(dropViews.dropId, params.dropId), eq(dropViews.studentId, params.studentId)))
      .limit(1);
    if (existing.length > 0) return;
  } else if (params.sessionId) {
    const existing = await db
      .select({ id: dropViews.id })
      .from(dropViews)
      .where(and(eq(dropViews.dropId, params.dropId), eq(dropViews.sessionId, params.sessionId)))
      .limit(1);
    if (existing.length > 0) return;
  }
  await db.insert(dropViews).values({
    dropId: params.dropId,
    studentId: params.studentId ?? null,
    sessionId: params.sessionId ?? null,
    viewedAt: new Date(),
  });
  // Increment denormalised impressions counter
  await db.update(drops).set({ impressions: sql`impressions + 1` }).where(eq(drops.id, params.dropId));
}

export async function getDropAnalyticsDetail(dropId: number, businessUserId: number) {
  const db = await getDb();
  if (!db) return null;

  // Verify ownership
  const dropRows = await db.select().from(drops).where(eq(drops.id, dropId)).limit(1);
  const drop = dropRows[0] ?? null;
  if (!drop || drop.businessId !== businessUserId) return null;

  // Claims
  const claimRows = await db
    .select({ userId: dropClaims.userId, claimedAt: dropClaims.claimedAt })
    .from(dropClaims)
    .where(eq(dropClaims.dropId, dropId))
    .orderBy(desc(dropClaims.claimedAt));
  const claimCount = claimRows.length;

  // Metrics
  const impressions = drop.impressions;
  const claimRate = impressions > 0 ? (claimCount / impressions) * 100 : 0;
  const sponsorshipFee = drop.sponsorshipFee; // cents
  const costPerImpression = impressions > 0 ? sponsorshipFee / 100 / impressions : 0;
  const costPerClaim = claimCount > 0 ? sponsorshipFee / 100 / claimCount : 0;

  // Fetch claimant user data for breakdowns (no PII — only yearLevel, postcode, schoolId)
  const claimantIds = claimRows.map(c => c.userId);
  const claimantUsers = claimantIds.length > 0
    ? await db
        .select({ id: users.id, yearLevel: users.yearLevel, postcode: users.postcode })
        .from(users)
        .where(inArray(users.id, claimantIds))
    : [];
  const claimantMap = new Map(claimantUsers.map(u => [u.id, u]));

  // School breakdown for claimants
  const claimantSchoolRows = claimantIds.length > 0
    ? await db
        .select({ schoolName: schools.name, userId: schoolStudents.studentId })
        .from(schoolStudents)
        .innerJoin(schools, eq(schools.id, schoolStudents.schoolId))
        .where(inArray(schoolStudents.studentId, claimantIds))
    : [];
  const claimantSchoolMap = new Map(claimantSchoolRows.map(r => [r.userId, r.schoolName]));

  // By school
  const bySchoolCounts: Record<string, number> = {};
  for (const c of claimRows) {
    const sn = claimantSchoolMap.get(c.userId) ?? "Other";
    bySchoolCounts[sn] = (bySchoolCounts[sn] ?? 0) + 1;
  }
  const bySchool = Object.entries(bySchoolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([school_name, count]) => ({ school_name, count }));

  // By year level
  const byYearCounts: Record<string, number> = {};
  for (const c of claimRows) {
    const u = claimantMap.get(c.userId);
    const yr = u?.yearLevel ?? "Not specified";
    byYearCounts[yr] = (byYearCounts[yr] ?? 0) + 1;
  }
  const byYearLevel = Object.entries(byYearCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([year, count]) => ({ year, count }));

  // By postcode
  const byPostcodeCounts: Record<string, number> = {};
  for (const c of claimRows) {
    const u = claimantMap.get(c.userId);
    if (u?.postcode) {
      byPostcodeCounts[u.postcode] = (byPostcodeCounts[u.postcode] ?? 0) + 1;
    }
  }
  const byPostcode = Object.entries(byPostcodeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([postcode, count]) => ({ postcode, count }));

  // Claims over time (by date + hour)
  const claimsOverTime: { date: string; hour: number; count: number }[] = [];
  const hourMap: Record<string, number> = {};
  for (const c of claimRows) {
    const d = c.claimedAt.toISOString().slice(0, 10);
    const h = c.claimedAt.getUTCHours();
    const key = `${d}:${h}`;
    hourMap[key] = (hourMap[key] ?? 0) + 1;
  }
  for (const [key, cnt] of Object.entries(hourMap).sort(([a], [b]) => a.localeCompare(b))) {
    const [date, hourStr] = key.split(":");
    claimsOverTime.push({ date, hour: parseInt(hourStr, 10), count: cnt });
  }

  return {
    drop: {
      id: drop.id,
      offer_title: drop.title,
      scheduled_date: drop.scheduledDate?.toISOString().slice(0, 10) ?? null,
      sponsorship_fee: sponsorshipFee,
      impressions,
      claims: claimCount,
    },
    metrics: {
      claim_rate: Math.round(claimRate * 100) / 100,
      cost_per_impression: Math.round(costPerImpression * 100) / 100,
      cost_per_claim: Math.round(costPerClaim * 100) / 100,
    },
    breakdowns: {
      by_school: bySchool,
      by_year_level: byYearLevel,
      by_postcode: byPostcode,
      claims_over_time: claimsOverTime,
    },
  };
}

// ─── User privacy settings ────────────────────────────────────────────────────

export async function updateUserPrivacy(userId: number, params: {
  shareContactWithEmployers?: boolean;
  yearLevel?: string | null;
  postcode?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ...params, updatedAt: new Date() }).where(eq(users.id, userId));
}
