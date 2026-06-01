import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// CORE AUTH TABLE
// ─────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  suspendedAt: timestamp("suspendedAt"),
  suspendedReason: text("suspendedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// USER PROFILES (extended student data)
// ─────────────────────────────────────────────

export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  school: varchar("school", { length: 255 }),
  grade: varchar("grade", { length: 64 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  anonymousAvatarStyle: varchar("anonymousAvatarStyle", { length: 64 }).default("branded_qmark"),
  quietMode: boolean("quietMode").default(false).notNull(),
  plainLanguage: boolean("plainLanguage").default(false).notNull(),
  steppedForms: boolean("steppedForms").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─────────────────────────────────────────────
// SQUADS (peer groups)
// ─────────────────────────────────────────────

export const squads = mysqlTable("squads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  school: varchar("school", { length: 255 }),
  type: mysqlEnum("type", ["auto", "custom"]).default("auto").notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Squad = typeof squads.$inferSelect;
export type InsertSquad = typeof squads.$inferInsert;

export const squadMembers = mysqlTable("squadMembers", {
  id: int("id").autoincrement().primaryKey(),
  squadId: int("squadId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type SquadMember = typeof squadMembers.$inferSelect;
export type InsertSquadMember = typeof squadMembers.$inferInsert;

// ─────────────────────────────────────────────
// POSTS (social feed)
// ─────────────────────────────────────────────

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  squadId: int("squadId"),
  likeCount: int("likeCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

export const postComments = mysqlTable("postComments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = typeof postComments.$inferInsert;

export const postLikes = mysqlTable("postLikes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = typeof postLikes.$inferInsert;

// ─────────────────────────────────────────────
// DIRECT MESSAGES
// ─────────────────────────────────────────────

export const directMessages = mysqlTable("directMessages", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = typeof directMessages.$inferInsert;

// ─────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  employer: varchar("employer", { length: 255 }).notNull(),
  description: text("description"),
  plainDescription: text("plainDescription"),
  wage: varchar("wage", { length: 64 }),
  distance: varchar("distance", { length: 64 }),
  type: mysqlEnum("type", ["casual", "part-time", "full-time", "volunteer"]).default("casual"),
  noCoverLetter: boolean("noCoverLetter").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  postedByUserId: int("postedByUserId"),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  featuredUntil: timestamp("featuredUntil"),
  expiresAt: timestamp("expiresAt"),
  viewCount: int("viewCount").default(0).notNull(),
  applyCount: int("applyCount").default(0).notNull(),
  autoRepostEnabled: boolean("autoRepostEnabled").default(false).notNull(),
  autoRepostNextDate: timestamp("autoRepostNextDate"),
  paymentToken: varchar("paymentToken", { length: 255 }),
  creditTransactionId: int("creditTransactionId"),
  reported: boolean("reported").default(false).notNull(),
  reportReason: text("reportReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const jobApplications = mysqlTable("jobApplications", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  userId: int("userId").notNull(),
  coverLetter: text("coverLetter"),
  status: mysqlEnum("status", ["applied", "viewed", "shortlisted", "rejected"]).default("applied").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;

// ─────────────────────────────────────────────
// THE DROP (weekly business perks)
// ─────────────────────────────────────────────

export const drops = mysqlTable("drops", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  businessId: int("businessId").notNull(),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  scheduledDate: timestamp("scheduledDate"),
  status: mysqlEnum("status", ["draft", "active", "expired"]).default("draft").notNull(),
  claimCount: int("claimCount").default(0).notNull(),
  maxClaims: int("maxClaims"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Drop = typeof drops.$inferSelect;
export type InsertDrop = typeof drops.$inferInsert;

export const dropClaims = mysqlTable("dropClaims", {
  id: int("id").autoincrement().primaryKey(),
  dropId: int("dropId").notNull(),
  userId: int("userId").notNull(),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
});

export type DropClaim = typeof dropClaims.$inferSelect;
export type InsertDropClaim = typeof dropClaims.$inferInsert;

// ─────────────────────────────────────────────
// REPORT CARDS (AI OCR verification)
// ─────────────────────────────────────────────

export const reportCards = mysqlTable("reportCards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  aiGrade: varchar("aiGrade", { length: 16 }),
  aiGpa: varchar("aiGpa", { length: 8 }),
  aiRawOutput: text("aiRawOutput"),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportCard = typeof reportCards.$inferSelect;
export type InsertReportCard = typeof reportCards.$inferInsert;

// ─────────────────────────────────────────────
// VOUCHES (supervisor / teacher endorsements)
// ─────────────────────────────────────────────

export const vouches = mysqlTable("vouches", {
  id: int("id").autoincrement().primaryKey(),
  studentUserId: int("studentUserId").notNull(),
  voucherName: varchar("voucherName", { length: 255 }).notNull(),
  voucherTitle: varchar("voucherTitle", { length: 255 }),
  voucherOrg: varchar("voucherOrg", { length: 255 }),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vouch = typeof vouches.$inferSelect;
export type InsertVouch = typeof vouches.$inferInsert;

// ─────────────────────────────────────────────
// CREDENTIALS (student achievements)
// ─────────────────────────────────────────────

export const credentials = mysqlTable("credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  issuer: varchar("issuer", { length: 255 }),
  description: text("description"),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  type: mysqlEnum("type", ["certificate", "badge", "award", "course", "other"]).default("other"),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = typeof credentials.$inferInsert;

// ─────────────────────────────────────────────
// UNIVERSITY SUBMISSIONS
// ─────────────────────────────────────────────

export const universitySubmissions = mysqlTable("universitySubmissions", {
  id: int("id").autoincrement().primaryKey(),
  studentUserId: int("studentUserId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  courseName: varchar("courseName", { length: 255 }),
  personalStatement: text("personalStatement"),
  status: mysqlEnum("status", ["draft", "submitted", "under_review", "accepted", "rejected"]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UniversitySubmission = typeof universitySubmissions.$inferSelect;
export type InsertUniversitySubmission = typeof universitySubmissions.$inferInsert;

// ─────────────────────────────────────────────
// INTERVIEW SESSIONS (YourWay AI practice)
// ─────────────────────────────────────────────

export const interviewSessions = mysqlTable("interviewSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }),
  messages: text("messages").notNull().default("[]"),
  status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;

// ─────────────────────────────────────────────
// EMPLOYER PROFILES (business-side users)
// ─────────────────────────────────────────────

export const employers = mysqlTable("employers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  abn: varchar("abn", { length: 16 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  industry: varchar("industry", { length: 128 }),
  postcode: varchar("postcode", { length: 8 }),
  visibleToSchools: boolean("visibleToSchools").default(true).notNull(),
  acceptsWorkExperience: boolean("acceptsWorkExperience").default(false).notNull(),
  paymentToken: varchar("paymentToken", { length: 255 }), // PinPayments reusable card token
  isGstRegistered: boolean("isGstRegistered").default(false).notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  suspendedAt: timestamp("suspendedAt"),
  suspendedReason: text("suspendedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employer = typeof employers.$inferSelect;
export type InsertEmployer = typeof employers.$inferInsert;

// ─────────────────────────────────────────────
// EMPLOYER CREDITS
// ─────────────────────────────────────────────

export const employerCredits = mysqlTable("employerCredits", {
  id: int("id").autoincrement().primaryKey(),
  employerId: int("employerId").notNull().unique(),
  creditBalance: int("creditBalance").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployerCredit = typeof employerCredits.$inferSelect;
export type InsertEmployerCredit = typeof employerCredits.$inferInsert;

// ─────────────────────────────────────────────
// CREDIT TRANSACTIONS
// ─────────────────────────────────────────────

export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  employerId: int("employerId").notNull(),
  amount: int("amount").notNull(), // positive = purchase/bonus, negative = spend
  type: mysqlEnum("type", ["purchase", "job_post", "refund", "promo_bonus", "auto_repost"]).notNull(),
  reference: varchar("reference", { length: 255 }), // charge_id, job_id, promo_code, etc.
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// ─────────────────────────────────────────────
// PROMO CODES
// ─────────────────────────────────────────────

export const promoCodes = mysqlTable("promoCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  discountType: mysqlEnum("discountType", ["fixed", "percentage"]).notNull(),
  discountValue: int("discountValue").notNull(), // dollars (cents) or percent integer
  bonusCredits: int("bonusCredits").default(0).notNull(), // extra credits awarded on use
  maxUses: int("maxUses"), // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"), // null = never
  isActive: boolean("isActive").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

// ─────────────────────────────────────────────
// PROMO REDEMPTIONS (per-user redemption log)
// ─────────────────────────────────────────────

export const promoRedemptions = mysqlTable("promoRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  promoCodeId: int("promoCodeId").notNull(),
  promoCode: varchar("promoCode", { length: 64 }).notNull(),
  redeemedByUserId: int("redeemedByUserId"), // null if redeemed via webhook without user context
  redeemedByEmployerId: int("redeemedByEmployerId"),
  discountType: mysqlEnum("discountType", ["fixed", "percentage"]).notNull(),
  discountValue: int("discountValue").notNull(),
  bonusCreditsAwarded: int("bonusCreditsAwarded").default(0).notNull(),
  chargeToken: varchar("chargeToken", { length: 255 }), // Pin charge reference
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type InsertPromoRedemption = typeof promoRedemptions.$inferInsert;

// ─────────────────────────────────────────────
// JOB ANALYTICS (views + applies per post)
// ─────────────────────────────────────────────

export const jobViews = mysqlTable("jobViews", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  viewerUserId: int("viewerUserId"), // null = anonymous
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type JobView = typeof jobViews.$inferSelect;
export type InsertJobView = typeof jobViews.$inferInsert;

// ─────────────────────────────────────────────
// WAITLIST SIGNUPS (pre-launch email capture)
// ─────────────────────────────────────────────

export const waitlistSignups = mysqlTable("waitlistSignups", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 128 }),
  role: mysqlEnum("role", ["student", "employer", "other"]).default("student").notNull(),
  school: varchar("school", { length: 255 }),
  source: varchar("source", { length: 64 }).default("landing_page").notNull(), // where they signed up from
  ipAddress: varchar("ipAddress", { length: 64 }),
  confirmed: boolean("confirmed").default(false).notNull(), // future email confirmation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type InsertWaitlistSignup = typeof waitlistSignups.$inferInsert;

// ─────────────────────────────────────────────
// SCHOOLS (careers & pathways staff portal)
// ─────────────────────────────────────────────

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull().unique(), // e.g. "brisbaneshs.eq.edu.au"
  careersContactName: varchar("careersContactName", { length: 255 }),
  careersContactEmail: varchar("careersContactEmail", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  state: varchar("state", { length: 3 }), // e.g. "QLD", "NSW"
  approved: boolean("approved").default(false).notNull(), // admin must approve before access is granted
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;

// ─────────────────────────────────────────────
// SCHOOL STUDENTS (join table)
// ─────────────────────────────────────────────

export const schoolStudents = mysqlTable("schoolStudents", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  studentId: int("studentId").notNull(), // FK → users.id
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
});

export type SchoolStudent = typeof schoolStudents.$inferSelect;
export type InsertSchoolStudent = typeof schoolStudents.$inferInsert;

// ─────────────────────────────────────────────
// PLACEMENTS (work experience workflow)
// ─────────────────────────────────────────────

export const placements = mysqlTable("placements", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(),
  studentId: int("studentId").notNull(),   // FK → users.id
  employerId: int("employerId").notNull(), // FK → employers.id
  jobId: int("jobId"),                     // optional — links to a posted job
  startDate: varchar("startDate", { length: 16 }).notNull(), // ISO date string "YYYY-MM-DD"
  endDate: varchar("endDate", { length: 16 }).notNull(),
  hoursPerWeek: int("hoursPerWeek").notNull(),
  status: mysqlEnum("status", [
    "draft",
    "pending_employer",
    "approved_by_employer",
    "approved_by_school",
    "completed",
    "rejected",
  ])
    .default("draft")
    .notNull(),
  // Digital signatures — typed name + timestamp stored as JSON string
  studentSignature: text("studentSignature"),   // e.g. '{"name":"Jamie Chen","at":"2025-01-15T10:30:00Z"}'
  employerSignature: text("employerSignature"),
  schoolSignature: text("schoolSignature"),
  // Employer approval token (UUID) — sent in the approval email link
  employerToken: varchar("employerToken", { length: 64 }).unique(),
  employerComment: text("employerComment"), // optional comment on approve/reject
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Placement = typeof placements.$inferSelect;
export type InsertPlacement = typeof placements.$inferInsert;

// ─────────────────────────────────────────────
// ADMIN AUDIT LOGS
// ─────────────────────────────────────────────

export const adminLogs = mysqlTable("adminLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // FK → users.id
  action: varchar("action", { length: 128 }).notNull(), // e.g. "approve_school", "adjust_credits"
  targetType: varchar("targetType", { length: 64 }), // e.g. "school", "employer", "user"
  targetId: int("targetId"), // the ID of the affected record
  details: text("details"), // JSON string with before/after or extra context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// ─────────────────────────────────────────────
// SCHOOL REQUESTS (self-service applications)
// ─────────────────────────────────────────────

export const schoolRequests = mysqlTable("schoolRequests", {
  id: int("id").autoincrement().primaryKey(),
  schoolName: varchar("schoolName", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SchoolRequest = typeof schoolRequests.$inferSelect;
export type InsertSchoolRequest = typeof schoolRequests.$inferInsert;

// ─────────────────────────────────────────────
// SCHOOL GROUPS (admin-created groups per school)
// ─────────────────────────────────────────────

export const schoolGroups = mysqlTable("schoolGroups", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(), // FK → schools.id
  groupName: varchar("groupName", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SchoolGroup = typeof schoolGroups.$inferSelect;
export type InsertSchoolGroup = typeof schoolGroups.$inferInsert;

export const studentGroupMemberships = mysqlTable("studentGroupMemberships", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(), // FK → users.id
  groupId: int("groupId").notNull(),     // FK → schoolGroups.id
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type StudentGroupMembership = typeof studentGroupMemberships.$inferSelect;
export type InsertStudentGroupMembership = typeof studentGroupMemberships.$inferInsert;

// ─────────────────────────────────────────────
// PAYMENT GATEWAY SETTINGS (encrypted API keys)
// ─────────────────────────────────────────────

export const paymentGatewaySettings = mysqlTable("paymentGatewaySettings", {
  id: int("id").autoincrement().primaryKey(),
  keyName: varchar("keyName", { length: 128 }).notNull().unique(), // e.g. "pin_secret_key"
  encryptedValue: text("encryptedValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy").notNull(), // FK → users.id (admin)
});

export type PaymentGatewaySetting = typeof paymentGatewaySettings.$inferSelect;
export type InsertPaymentGatewaySetting = typeof paymentGatewaySettings.$inferInsert;

// ─────────────────────────────────────────────
// TRANSACTIONS (PinPayments charge records)
// ─────────────────────────────────────────────

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  employerId: int("employerId").notNull(), // FK → employers.id
  amountCents: int("amountCents").notNull(), // amount in cents (AUD)
  pinpaymentsChargeId: varchar("pinpaymentsChargeId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "succeeded", "refunded"]).default("pending").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─────────────────────────────────────────────
// EMPLOYER STATUS (suspension tracking)
// ─────────────────────────────────────────────
// Note: status is tracked via employers.suspendedAt column added via SQL migration
// The employers table is extended via ALTER TABLE in the migration below.
