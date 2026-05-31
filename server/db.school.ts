/**
 * School-related database helpers.
 * All queries return null / [] when the DB is unavailable (same pattern as db.ts).
 */

import { and, eq, like, or, sql } from "drizzle-orm";
import {
  employers,
  jobApplications,
  jobs,
  placements,
  schoolStudents,
  schools,
  userProfiles,
  users,
  credentials,
  vouches,
  reportCards,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Schools ──────────────────────────────────────────────────────────────────

export async function getSchoolByDomain(domain: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schools).where(eq(schools.domain, domain)).limit(1);
  return rows[0] ?? null;
}

export async function getSchoolById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAllSchools() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schools).orderBy(schools.name);
}

export async function createSchool(data: {
  name: string;
  domain: string;
  careersContactName?: string;
  careersContactEmail?: string;
  phone?: string;
  state?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(schools).values({
    name: data.name,
    domain: data.domain.toLowerCase().trim(),
    careersContactName: data.careersContactName ?? null,
    careersContactEmail: data.careersContactEmail ?? null,
    phone: data.phone ?? null,
    state: data.state ?? null,
    approved: false,
  });
}

export async function approveSchool(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(schools).set({ approved: true }).where(eq(schools.id, id));
}

// ─── School students ──────────────────────────────────────────────────────────

/** Auto-enrol a student in a school based on their email domain. */
export async function enrolStudentInSchool(schoolId: number, studentId: number) {
  const db = await getDb();
  if (!db) return;
  // Ignore duplicate enrolments
  const existing = await db
    .select()
    .from(schoolStudents)
    .where(and(eq(schoolStudents.schoolId, schoolId), eq(schoolStudents.studentId, studentId)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(schoolStudents).values({ schoolId, studentId });
}

/** Return all students enrolled in a school with their profile and application counts. */
export async function getStudentsForSchool(
  schoolId: number,
  opts?: { incompleteOnly?: boolean; search?: string }
) {
  const db = await getDb();
  if (!db) return [];

  // Fetch enrolled student IDs
  const enrolled = await db
    .select({ studentId: schoolStudents.studentId })
    .from(schoolStudents)
    .where(eq(schoolStudents.schoolId, schoolId));

  if (enrolled.length === 0) return [];
  const studentIds = enrolled.map((r) => r.studentId);

  // Fetch user + profile data for each student
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      school: userProfiles.school,
      grade: userProfiles.grade,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(
      and(
        sql`${users.id} IN (${sql.join(
          studentIds.map((id) => sql`${id}`),
          sql`, `
        )})`,
        opts?.search
          ? or(
              like(users.name, `%${opts.search}%`),
              like(users.email, `%${opts.search}%`)
            )
          : undefined
      )
    );

  // For each student, count credentials + vouches (verified items) and job applications
  const result = await Promise.all(
    rows.map(async (student) => {
      const [credCount, vouchCount, appCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(credentials)
          .where(eq(credentials.userId, student.id)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(vouches)
          .where(and(eq(vouches.studentUserId, student.id), eq(vouches.status, "verified"))),
        db
          .select({ count: sql<number>`count(*)` })
          .from(jobApplications)
          .where(eq(jobApplications.userId, student.id)),
      ]);

      const verifiedItems =
        Number(credCount[0]?.count ?? 0) + Number(vouchCount[0]?.count ?? 0);
      const applicationCount = Number(appCount[0]?.count ?? 0);

      return { ...student, verifiedItems, applicationCount };
    })
  );

  if (opts?.incompleteOnly) {
    return result.filter((s) => s.verifiedItems < 2);
  }
  return result;
}

/** Return a single student's kit details (credentials, vouches, report cards) and applications. */
export async function getStudentKitForSchool(studentId: number) {
  const db = await getDb();
  if (!db) return null;

  const [userRows, profileRows, credRows, vouchRows, rcRows, appRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, studentId)).limit(1),
    db.select().from(userProfiles).where(eq(userProfiles.userId, studentId)).limit(1),
    db.select().from(credentials).where(eq(credentials.userId, studentId)),
    db.select().from(vouches).where(eq(vouches.studentUserId, studentId)),
    db.select().from(reportCards).where(eq(reportCards.userId, studentId)),
    db
      .select({
        id: jobApplications.id,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        jobTitle: jobs.title,
        employer: jobs.employer,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobs.id, jobApplications.jobId))
      .where(eq(jobApplications.userId, studentId)),
  ]);

  if (!userRows[0]) return null;

  return {
    user: userRows[0],
    profile: profileRows[0] ?? null,
    credentials: credRows,
    vouches: vouchRows,
    reportCards: rcRows,
    applications: appRows,
  };
}

// ─── Employer directory (school view) ─────────────────────────────────────────

export async function getEmployersForSchools(opts?: {
  search?: string;
  postcode?: string;
  industry?: string;
  acceptsWorkExperienceOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(employers.visibleToSchools, true)];

  if (opts?.acceptsWorkExperienceOnly) {
    conditions.push(eq(employers.acceptsWorkExperience, true));
  }
  if (opts?.postcode) {
    conditions.push(eq(employers.postcode, opts.postcode));
  }
  if (opts?.industry) {
    conditions.push(like(employers.industry, `%${opts.industry}%`));
  }
  if (opts?.search) {
    conditions.push(
      or(
        like(employers.businessName, `%${opts.search}%`),
        like(employers.contactEmail, `%${opts.search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: employers.id,
      businessName: employers.businessName,
      contactEmail: employers.contactEmail,
      contactPhone: employers.contactPhone,
      industry: employers.industry,
      postcode: employers.postcode,
      acceptsWorkExperience: employers.acceptsWorkExperience,
    })
    .from(employers)
    .where(and(...conditions))
    .orderBy(employers.businessName);

  // Attach active job listings for each employer
  return Promise.all(
    rows.map(async (emp) => {
      const activeJobs = await db
        .select({ id: jobs.id, title: jobs.title, wage: jobs.wage, distance: jobs.distance })
        .from(jobs)
        .where(and(eq(jobs.postedByUserId, emp.id), eq(jobs.isActive, true)));
      return { ...emp, activeJobs };
    })
  );
}

// ─── Placements ───────────────────────────────────────────────────────────────

export async function createPlacement(data: {
  schoolId: number;
  studentId: number;
  employerId: number;
  jobId?: number | null;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
  notes?: string;
  employerToken: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(placements).values({
    schoolId: data.schoolId,
    studentId: data.studentId,
    employerId: data.employerId,
    jobId: data.jobId ?? null,
    startDate: data.startDate,
    endDate: data.endDate,
    hoursPerWeek: data.hoursPerWeek,
    notes: data.notes ?? null,
    employerToken: data.employerToken,
    status: "pending_employer",
  });
  return result;
}

export async function getPlacementsBySchool(
  schoolId: number,
  opts?: { studentId?: number; status?: string; search?: string }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(placements.schoolId, schoolId)];
  if (opts?.studentId) conditions.push(eq(placements.studentId, opts.studentId));
  if (opts?.status) {
    conditions.push(
      eq(
        placements.status,
        opts.status as
          | "draft"
          | "pending_employer"
          | "approved_by_employer"
          | "approved_by_school"
          | "completed"
          | "rejected"
      )
    );
  }

  const rows = await db
    .select({
      id: placements.id,
      studentId: placements.studentId,
      employerId: placements.employerId,
      jobId: placements.jobId,
      startDate: placements.startDate,
      endDate: placements.endDate,
      hoursPerWeek: placements.hoursPerWeek,
      status: placements.status,
      studentSignature: placements.studentSignature,
      employerSignature: placements.employerSignature,
      schoolSignature: placements.schoolSignature,
      employerComment: placements.employerComment,
      notes: placements.notes,
      createdAt: placements.createdAt,
      updatedAt: placements.updatedAt,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(placements)
    .leftJoin(users, eq(users.id, placements.studentId))
    .where(and(...conditions))
    .orderBy(placements.createdAt);

  return rows;
}

export async function getPlacementById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(placements).where(eq(placements.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPlacementByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(placements)
    .where(eq(placements.employerToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function updatePlacementStatus(
  id: number,
  status: "approved_by_employer" | "approved_by_school" | "completed" | "rejected",
  signature?: { field: "employerSignature" | "schoolSignature" | "studentSignature"; value: string },
  comment?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const updateData: Record<string, unknown> = { status };
  if (signature) updateData[signature.field] = signature.value;
  if (comment !== undefined) updateData.employerComment = comment;

  await db.update(placements).set(updateData).where(eq(placements.id, id));
}

export async function signPlacementAsStudent(id: number, studentName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const sig = JSON.stringify({ name: studentName, at: new Date().toISOString() });
  await db
    .update(placements)
    .set({ studentSignature: sig, status: "completed" })
    .where(eq(placements.id, id));
}

/** Return placements sent to a specific employer (by employer.id). */
export async function getPlacementsForEmployer(employerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(placements)
    .where(eq(placements.employerId, employerId))
    .orderBy(placements.createdAt);
}
