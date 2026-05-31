import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
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
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
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
  waitlistSignups,
  WaitlistSignup,
} from "../drizzle/schema";
import { and, lte, desc, sql } from "drizzle-orm";

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
