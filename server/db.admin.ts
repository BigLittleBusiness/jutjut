/**
 * Admin DB helpers — query functions for the Admin Dashboard.
 * All functions return raw Drizzle rows; business logic lives in the router.
 * Uses the same async getDb() pattern as db.school.ts.
 */

import { getDb } from "./db";
import {
  users,
  employers,
  schools,
  jobs,
  drops,
  dropClaims,
  adminLogs,
  schoolRequests,
  schoolGroups,
  studentGroupMemberships,
  paymentGatewaySettings,
  transactions,
  creditTransactions,
  employerCredits,
  waitlistSignups,
  jobApplications,
  placements,
} from "../drizzle/schema";
import { eq, and, like, or, gte, lte, desc, sql, count } from "drizzle-orm";

// ─── Overview metrics ─────────────────────────────────────────────────────────

export async function getOverviewMetrics() {
  const db = await getDb();
  if (!db) return {
    totalStudents: 0, totalEmployers: 0, approvedSchools: 0,
    activeJobs: 0, dropClaimsThisMonth: 0, revenueThisMonthCents: 0,
  };

  const [
    [{ totalStudents }],
    [{ totalEmployers }],
    [{ approvedSchools }],
    [{ activeJobs }],
    [{ dropClaimsThisMonth }],
    [{ revenueThisMonth }],
  ] = await Promise.all([
    db.select({ totalStudents: count() }).from(users).where(eq(users.role, "user")),
    db.select({ totalEmployers: count() }).from(employers),
    db.select({ approvedSchools: count() }).from(schools).where(eq(schools.approved, true)),
    db.select({ activeJobs: count() }).from(jobs).where(eq(jobs.isActive, true)),
    db.select({ dropClaimsThisMonth: count() }).from(dropClaims)
      .where(gte(dropClaims.claimedAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`)),
    db.select({ revenueThisMonth: sql<number>`COALESCE(SUM(amountCents), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.status, "succeeded"),
        gte(transactions.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`)
      )),
  ]);
  return { totalStudents, totalEmployers, approvedSchools, activeJobs, dropClaimsThisMonth, revenueThisMonthCents: revenueThisMonth };
}

export async function getSignupsLast30Days() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ date: sql<string>`DATE(createdAt)`, signups: count() })
    .from(users)
    .where(gte(users.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
}

// ─── Admin audit log ──────────────────────────────────────────────────────────

export async function writeAdminLog(entry: {
  adminId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminLogs).values({
    adminId: entry.adminId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    details: entry.details ? JSON.stringify(entry.details) : null,
  });
}

export async function getAdminLogs(filters: {
  adminId?: number;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.adminId) conditions.push(eq(adminLogs.adminId, filters.adminId));
  if (filters.action) conditions.push(like(adminLogs.action, `%${filters.action}%`));
  if (filters.from) conditions.push(gte(adminLogs.createdAt, filters.from));
  if (filters.to) conditions.push(lte(adminLogs.createdAt, filters.to));

  return db
    .select({ log: adminLogs, adminName: users.name, adminEmail: users.email })
    .from(adminLogs)
    .leftJoin(users, eq(adminLogs.adminId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(adminLogs.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
}

// ─── School requests ──────────────────────────────────────────────────────────

export async function getAllSchoolRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(schoolRequests)
      .where(eq(schoolRequests.status, status))
      .orderBy(desc(schoolRequests.createdAt));
  }
  return db.select().from(schoolRequests).orderBy(desc(schoolRequests.createdAt));
}

export async function getSchoolRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(schoolRequests).where(eq(schoolRequests.id, id));
  return row ?? null;
}

export async function createSchoolRequest(data: {
  schoolName: string;
  domain: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(schoolRequests).values({ ...data, status: "pending" });
}

export async function updateSchoolRequestStatus(
  id: number,
  status: "approved" | "rejected",
  adminNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(schoolRequests)
    .set({ status, adminNote: adminNote ?? null })
    .where(eq(schoolRequests.id, id));
}

// ─── Schools (admin CRUD) ─────────────────────────────────────────────────────

export async function adminListSchools(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(schools)
      .where(or(like(schools.name, `%${search}%`), like(schools.domain, `%${search}%`)))
      .orderBy(desc(schools.createdAt));
  }
  return db.select().from(schools).orderBy(desc(schools.createdAt));
}

export async function adminCreateSchool(data: {
  name: string;
  domain: string;
  careersContactName?: string;
  careersContactEmail?: string;
  phone?: string;
  state?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(schools).values({ ...data, approved: true });
}

export async function adminUpdateSchool(
  id: number,
  data: Partial<{
    name: string; domain: string; careersContactName: string;
    careersContactEmail: string; phone: string; state: string; approved: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(schools).set(data).where(eq(schools.id, id));
}

// ─── School groups ────────────────────────────────────────────────────────────

export async function getGroupsForSchool(schoolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      group: schoolGroups,
      memberCount: sql<number>`(SELECT COUNT(*) FROM studentGroupMemberships WHERE groupId = ${schoolGroups.id})`,
    })
    .from(schoolGroups)
    .where(eq(schoolGroups.schoolId, schoolId))
    .orderBy(schoolGroups.groupName);
}

export async function createSchoolGroup(data: {
  schoolId: number; groupName: string; description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(schoolGroups).values(data).$returningId();
  return result.id;
}

export async function updateSchoolGroup(id: number, data: { groupName?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(schoolGroups).set(data).where(eq(schoolGroups.id, id));
}

export async function deleteSchoolGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(studentGroupMemberships).where(eq(studentGroupMemberships.groupId, id));
  await db.delete(schoolGroups).where(eq(schoolGroups.id, id));
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: studentGroupMemberships, user: users })
    .from(studentGroupMemberships)
    .leftJoin(users, eq(studentGroupMemberships.studentId, users.id))
    .where(eq(studentGroupMemberships.groupId, groupId));
}

export async function addStudentToGroup(studentId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(studentGroupMemberships).ignore().values({ studentId, groupId });
}

export async function removeStudentFromGroup(studentId: number, groupId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(studentGroupMemberships)
    .where(and(
      eq(studentGroupMemberships.studentId, studentId),
      eq(studentGroupMemberships.groupId, groupId)
    ));
}

// ─── Employers (admin moderation) ────────────────────────────────────────────

export async function adminListEmployers(filters: {
  search?: string;
  status?: "active" | "suspended";
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.status) conditions.push(eq(employers.status, filters.status));
  if (filters.search) {
    conditions.push(or(
      like(employers.businessName, `%${filters.search}%`),
      like(employers.contactEmail, `%${filters.search}%`)
    ));
  }
  return db
    .select({ employer: employers, user: users, credits: employerCredits })
    .from(employers)
    .leftJoin(users, eq(employers.userId, users.id))
    .leftJoin(employerCredits, eq(employerCredits.employerId, employers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(employers.createdAt));
}

export async function adminUpdateEmployer(
  id: number,
  data: Partial<{
    businessName: string; contactEmail: string; contactPhone: string; address: string;
    status: "active" | "suspended"; suspendedAt: Date | null; suspendedReason: string | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(employers).set(data).where(eq(employers.id, id));
}

export async function getEmployerJobs(employerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.postedByUserId, employerId)).orderBy(desc(jobs.createdAt));
}

export async function getFlaggedJobs() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ job: jobs, employer: employers })
    .from(jobs)
    .leftJoin(employers, eq(jobs.postedByUserId, employers.userId))
    .where(eq(jobs.reported, true))
    .orderBy(desc(jobs.createdAt));
}

export async function adminUpdateJob(
  id: number,
  data: Partial<{ isActive: boolean; reported: boolean; reportReason: string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

// ─── Students (admin support) ─────────────────────────────────────────────────

export async function adminSearchStudents(search: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users)
    .where(and(
      eq(users.role, "user"),
      or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))
    ))
    .limit(50);
}

export async function adminGetStudentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return null;

  const [apps, userPlacements, groupMemberships] = await Promise.all([
    db.select().from(jobApplications).where(eq(jobApplications.userId, id)).limit(20),
    db.select().from(placements).where(eq(placements.studentId, id)).limit(20),
    db.select({ membership: studentGroupMemberships, group: schoolGroups })
      .from(studentGroupMemberships)
      .leftJoin(schoolGroups, eq(studentGroupMemberships.groupId, schoolGroups.id))
      .where(eq(studentGroupMemberships.studentId, id)),
  ]);

  return { user, applications: apps, placements: userPlacements, groups: groupMemberships };
}

export async function adminUpdateUser(
  id: number,
  data: Partial<{ name: string; email: string; yearLevel: string; bio: string; profilePictureUrl: string; status: "active" | "suspended"; suspendedAt: Date | null; suspendedReason: string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set(data as any).where(eq(users.id, id));
}

export async function adminSuspendUser(id: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ status: "suspended", suspendedAt: new Date(), suspendedReason: reason } as any).where(eq(users.id, id));
}

export async function adminReinstateUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ status: "active", suspendedAt: null, suspendedReason: null } as any).where(eq(users.id, id));
}

// ─── Drops (approval queue) ───────────────────────────────────────────────────

export async function adminListDrops(status?: "draft" | "active" | "expired") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(drops).where(eq(drops.status, status)).orderBy(desc(drops.createdAt));
  }
  return db.select().from(drops).orderBy(desc(drops.createdAt));
}

export async function adminUpdateDrop(
  id: number,
  data: Partial<{ status: "draft" | "active" | "expired"; scheduledDate: Date }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(drops).set(data).where(eq(drops.id, id));
}

export async function adminDeleteDrop(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(drops).where(eq(drops.id, id));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function adminListTransactions(filters: {
  employerId?: number;
  status?: "pending" | "succeeded" | "refunded";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.employerId) conditions.push(eq(transactions.employerId, filters.employerId));
  if (filters.status) conditions.push(eq(transactions.status, filters.status));

  return db
    .select({ transaction: transactions, employer: employers })
    .from(transactions)
    .leftJoin(employers, eq(transactions.employerId, employers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);
}

export async function adminUpdateTransactionStatus(
  id: number,
  status: "pending" | "succeeded" | "refunded"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(transactions).set({ status }).where(eq(transactions.id, id));
}

// ─── Payment gateway settings ─────────────────────────────────────────────────

export async function getPaymentGatewaySettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentGatewaySettings).orderBy(paymentGatewaySettings.keyName);
}

export async function upsertPaymentGatewaySetting(
  keyName: string,
  encryptedValue: string,
  updatedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(paymentGatewaySettings)
    .values({ keyName, encryptedValue, updatedBy })
    .onDuplicateKeyUpdate({ set: { encryptedValue, updatedBy } });
}

// ─── Admin user management ────────────────────────────────────────────────────

export async function listAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin")).orderBy(users.name);
}

export async function promoteToAdmin(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

export async function demoteFromAdmin(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role: "user" }).where(eq(users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ?? null;
}

// ─── Global user search ───────────────────────────────────────────────────────

export async function globalUserSearch(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users)
    .where(or(like(users.name, `%${query}%`), like(users.email, `%${query}%`)))
    .limit(20)
    .orderBy(users.name);
}

// ─── Credit adjustments ───────────────────────────────────────────────────────

export async function adminAdjustCredits(employerId: number, delta: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(employerCredits)
    .values({ employerId, creditBalance: delta })
    .onDuplicateKeyUpdate({ set: { creditBalance: sql`creditBalance + ${delta}` } });
  await db.insert(creditTransactions).values({
    employerId, amount: delta, type: "promo_bonus", description: reason,
  });
}

// ─── Employer stored tokens ───────────────────────────────────────────────────

export async function listEmployersWithTokens() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ employer: employers, user: users })
    .from(employers)
    .leftJoin(users, eq(employers.userId, users.id))
    .where(sql`${employers.paymentToken} IS NOT NULL`);
}

export async function clearEmployerPaymentToken(employerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(employers).set({ paymentToken: null }).where(eq(employers.id, employerId));
}

// ─── Waitlist summary ─────────────────────────────────────────────────────────

export async function getWaitlistSummary() {
  const db = await getDb();
  if (!db) return { total: 0 };
  const [{ total }] = await db.select({ total: count() }).from(waitlistSignups);
  return { total };
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

export async function getEmailLogs(opts: {
  search?: string;
  status?: string;
  templateId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { emailLogs } = await import("../drizzle/schema");

  const conditions: any[] = [];
  if (opts.search) conditions.push(like(emailLogs.toEmail, `%${opts.search}%`));
  if (opts.status) conditions.push(eq(emailLogs.status, opts.status as any));
  if (opts.templateId) conditions.push(eq(emailLogs.templateId, opts.templateId));
  if (opts.from) conditions.push(gte(emailLogs.createdAt, opts.from));
  if (opts.to) conditions.push(lte(emailLogs.createdAt, opts.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [rows, countResult] = await Promise.all([
    db.select().from(emailLogs).where(where).orderBy(desc(emailLogs.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(emailLogs).where(where),
  ]);

  return { rows, total: Number(countResult[0]?.total ?? 0) };
}

export async function getEmailLogStats() {
  const db = await getDb();
  if (!db) return { sent: 0, delivered: 0, bounced: 0, complaint: 0, failed: 0 };
  const { emailLogs } = await import("../drizzle/schema");

  const result = await db.select({
    status: emailLogs.status,
    cnt: count(),
  }).from(emailLogs).groupBy(emailLogs.status);

  const stats = { sent: 0, delivered: 0, bounced: 0, complaint: 0, failed: 0 };
  for (const row of result) {
    stats[row.status as keyof typeof stats] = Number(row.cnt);
  }
  return stats;
}

export async function getDistinctEmailTemplateIds(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const { emailLogs } = await import("../drizzle/schema");
  const rows = await db.selectDistinct({ templateId: emailLogs.templateId }).from(emailLogs);
  return rows.map((r) => r.templateId).sort();
}

// ─── In-App Notifications ─────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { inAppNotifications } = await import("../drizzle/schema");
  await db.insert(inAppNotifications).values(data);
}

export async function getNotificationsForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const { inAppNotifications } = await import("../drizzle/schema");
  return db.select().from(inAppNotifications)
    .where(eq(inAppNotifications.userId, userId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { inAppNotifications } = await import("../drizzle/schema");
  const [{ cnt }] = await db.select({ cnt: count() }).from(inAppNotifications)
    .where(and(eq(inAppNotifications.userId, userId), eq(inAppNotifications.read, false)));
  return Number(cnt);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { inAppNotifications } = await import("../drizzle/schema");
  await db.update(inAppNotifications)
    .set({ read: true })
    .where(and(eq(inAppNotifications.id, id), eq(inAppNotifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  const { inAppNotifications } = await import("../drizzle/schema");
  await db.update(inAppNotifications)
    .set({ read: true })
    .where(eq(inAppNotifications.userId, userId));
}
