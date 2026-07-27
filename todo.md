# JutJut — TODO

## Infrastructure & Setup
- [x] Upgrade project to full-stack (web-db-user features: db, server, user)
- [x] Resolve main.tsx merge conflict — tRPC + QueryClientProvider wiring
- [x] Install all full-stack dependencies (drizzle-orm, trpc, tanstack-query, etc.)
- [x] Design and push complete database schema (17 tables)
- [x] Configure Claude (claude-sonnet-4-5) as LLM provider — no OpenAI

## Database Schema (all tables live in DB)
- [x] users — core auth table (Manus OAuth)
- [x] userProfiles — extended student data, accessibility preferences
- [x] squads — peer groups (auto by school/grade or custom)
- [x] squadMembers — squad membership join table
- [x] posts — social feed with anonymous posting
- [x] postComments — comments on posts
- [x] postLikes — likes on posts
- [x] directMessages — 1:1 messaging between users
- [x] jobs — job listings with plain-language descriptions
- [x] jobApplications — applications with status tracking
- [x] drops — weekly business perks ("The Drop")
- [x] dropClaims — claim tracking for drops
- [x] reportCards — AI OCR verification via Claude
- [x] vouches — supervisor/teacher endorsements
- [x] credentials — student achievements (certificates, badges, awards)
- [x] universitySubmissions — uni application tracking
- [x] interviewSessions — YourWay AI interview practice sessions

## Features to Build
- [ ] Landing page (Home.tsx) — public-facing with hero, features, CTA
- [ ] Auth flow — login/logout via Manus OAuth
- [ ] Student profile page — avatar, bio, school, grade, accessibility settings
- [ ] Social feed — posts with anonymous toggle, likes, comments
- [ ] Squad management — view/join squads, create custom squads
- [ ] Jobs board — browse listings, plain-language toggle, apply
- [ ] The Drop — weekly perks listing, claim flow
- [ ] Report card upload — file upload + Claude OCR verification
- [ ] Vouches — request and display endorsements
- [ ] Credentials — upload and showcase achievements
- [ ] University submissions — track application status
- [ ] YourWay AI interview practice — chat interface using Claude
- [ ] DM inbox — direct messaging between users
- [ ] Admin panel — manage users, jobs, drops (admin role only)
- [ ] Accessibility settings — quiet mode, plain language, stepped forms

## Employer Monetisation (Business Model)
- [x] Extend DB schema — employers, employerCredits, creditTransactions, promoCodes, jobViews tables
- [x] Add auto_repost columns to jobs table (autoRepostEnabled, autoRepostNextDate, paymentToken)
- [x] PinPayments API helper (server/pinpayments.ts) — createCharge, createCustomer, verifyWebhookSignature
- [x] Credit pack pricing — pack_1 ($15 AUD / 1 credit), pack_5 ($50 AUD / 5 credits)
- [x] calculateChargeAmount — percentage/fixed discount + optional 10% GST
- [x] ENV vars for PinPayments (PIN_PAYMENTS_SECRET_KEY, PIN_PAYMENTS_PUBLISHABLE_KEY, PIN_PAYMENTS_WEBHOOK_SECRET, PIN_PAYMENTS_BASE_URL)
- [x] DB helpers — employer CRUD, credit balance, adjustCredits, transaction history, promo code CRUD, job analytics, auto-repost candidates
- [x] tRPC employer router — profile upsert, credit balance, pack list, promo validation, credit purchase, job post, job analytics
- [x] tRPC admin router — promo code list, create, update (admin role gated)
- [x] Auto-repost cron job (node-cron, daily 02:00 AEST) — deducts credit or charges stored payment token; disables on failure
- [x] PinPayments webhook handler (POST /webhooks/pinpayments) — HMAC-SHA256 signature verification, charge.succeeded event
- [x] Employer Dashboard page — credit balance card, buy credits modal, post job modal, analytics table, transaction history
- [x] Admin Promo Codes page — create/list/activate promo codes (admin-only)
- [x] Routes wired in App.tsx — /employer, /admin-promos
- [x] Vitest tests — 15 tests covering credit packs, charge calculation, webhook signature (all passing)
- [x] Promo code redemption detail view — promoRedemptions table, per-user history with name/email/date/discount, drawer UI, 19 new tests (61 total passing)

## Marketing Landing Page
- [x] Public marketing landing page — 9 sections (Hero + My Kit mockup, For Students, Your Way, For Employers, The Drop, Pricing, Trust, Waitlist form, Footer), fully responsive, self-contained HTML/CSS/JS, live counter, Quiet Mode toggle
- [x] Landing page renders without app shell (own nav/footer, no Navbar wrapper)
- [x] LandingPage.tsx component wired into App.tsx routing

## Landing Page Enhancements & Feature Pages
- [x] Wire Sign In button on landing page to app login flow (postMessage → JUTJUT_NAVIGATE)
- [x] My Kit feature page confirmed fully built — verified skills, report cards, credentials, vouches
- [x] Jobs feature page confirmed fully built — listings, plain-language toggle, one-click apply
- [x] Add scroll reveal animations via IntersectionObserver (fade-up, slide-left/right, staggered delays)
- [x] Add hover lift + shadow effects on all .btn CTA elements (prefers-reduced-motion respected)
- [x] Deep-link CTAs: "Explore My Kit" and "Browse Jobs Board" route to feature pages (login-gated)
- [x] Landing page nav items already link to in-page anchor sections (#students, #yourway, #employers, etc.)
- [x] 15 new landing navigation tests (103 total passing)

## New Feature Tasks
- [x] Jobs board: search bar and category filters (role type, location, wage, timing)
- [x] Landing page: interactive FAQ accordion section with common user questions
- [x] Login screen: Forgot Password flow with clean UI for credential reset

## Waitlist Email Capture
- [x] Create waitlistSignups table in database schema
- [x] Add tRPC public procedure for email submission (validation, duplicate check, owner notification)
- [x] Wire landing page waitlist form to the tRPC endpoint (role selector, name, email, school, loading/success/duplicate/error states)
- [x] Show success/error/duplicate states in the form UI
- [x] Add admin view for waitlist signups in the Dashboard (AdminWaitlist page with search, role filter, CSV export, summary stats)
- [x] Write 18 Vitest tests for waitlist feature (join success/duplicate/error, input validation, count, list access control) — 169 total passing

## Waitlist Form Enhancements
- [x] Real-time inline email validation (blur + on-change, animated error message, green/red border feedback)
- [x] Make first name field mandatory (server schema, form UI, 2 new tests — 181 total passing)
- [x] Confetti success animation (3-burst cannon in brand colours, successPop + bounceIn card animations, prefers-reduced-motion respected)
- [x] Honeypot spam protection (hidden off-screen input, fake success shown to bots, 2 new server contract tests — 183 total passing)

## Infrastructure & AWS Deployment Readiness
- [x] .env.example — documents every required and optional environment variable with comments
- [x] Dockerfile — multi-stage build (deps → build → runner), HEALTHCHECK, non-root production image
- [x] docker-compose.yml — local dev environment with MySQL 8 + hot-reload app service
- [x] .github/workflows/ci.yml — type-check + vitest on every push to main and every PR
- [x] .github/workflows/deploy.yml — build → ECR push → ECS Fargate rolling deploy on push to main
- [x] infrastructure/nginx.conf — production reverse-proxy with TLS, gzip, security headers, static-asset caching
- [x] infrastructure/ecs-task-definition.json — ECS Fargate task definition template with Secrets Manager refs
- [x] infrastructure/DEPLOY.md — step-by-step AWS deployment runbook (ECS Fargate + EC2 options)

## Developer Experience
- [x] CONTRIBUTING.md — prerequisites, local setup, project structure, conventions, testing guide, PR process
- [x] JUTJUT_README.md — project overview, tech stack, quick start, scripts, structure, deployment summary

## Schools Portal (Careers & Pathways Dashboard)
- [x] Extend DB schema: schools, school_students, placements tables; add visibleToSchools/contactPhone/industry/acceptsWorkExperience to employers table
- [x] DB helpers in server/db.school.ts (school CRUD, student list/kit/enrol, employer directory, placement CRUD, status updates, signatures)
- [x] School tRPC router: school.auth.register/me, school.manage.list/approve, school.students.list/kit/enrol, school.employers.list, school.placements.create/list/get/signAsSchool/employerRespond/signAsStudent/myPlacements
- [x] SchoolPortal frontend page with 3 tabs: Students, Employers, Placements
- [x] Registration gate: unregistered → registration form, pending → pending screen, approved → full dashboard
- [x] Students tab: searchable table with kit completeness badges (Strong/Building/Empty), drill-down to full student kit view (credentials, vouches, report cards, applications)
- [x] Employers tab: card grid with search, industry filter, work-experience toggle, contact details, active jobs list
- [x] Placements tab: status-filtered table, create placement dialog, school sign button, E/S/T signature status indicators
- [x] Schools Portal button added to Admin Pages quick links in Dashboard (teal accent styling)
- [x] Route registered in App.tsx (school-portal)
- [x] 34 Vitest tests for school router (auth, manage, students, employers, placements) — 217 total passing

## Admin Dashboard (10 Sections)
- [x] Extend DB schema: adminLogs, schoolRequests, schoolGroups, schoolGroupMembers, paymentGatewaySettings tables; employers.status/suspendedAt/suspendedReason; jobs.reported/reportReason columns
- [x] Encryption utility (AES-256-GCM) for gateway key storage at rest
- [x] DB helpers in server/db.admin.ts — all 10 admin sections (overview metrics, school requests/management/groups, employer moderation, student support, drops, payments, admin management, global search, audit logs)
- [x] Admin tRPC router: overview, schools (requests/list/create/update/groups), promoCodes, drops, employers (list/suspend/reinstate/adjustCredits/flaggedJobs/resolveJob/paymentTokens), students (search/get/update), payments (transactions/refund/gatewaySettings/setGatewaySetting), admins (list/promote/demote), search, logs
- [x] AdminDashboard.tsx: collapsible sidebar shell with 10 section views (Overview, School Management, Promo Codes, The Drop Queue, Employer Moderation, Student Support, Payments, Admin Management, Global Search, System Logs)
- [x] Admin Dashboard button added to Dashboard quick links (violet accent)
- [x] Route registered in App.tsx (admin-dashboard)
- [x] 45 Vitest tests for all admin procedures — 262 total passing across 9 test files

## Email & Notification System (AWS SES)
- [x] Add email_logs and email_preferences tables to DB schema and push migration
- [x] Install @aws-sdk/client-ses package
- [x] Build renderEmail template engine (HTML + plain-text, {{placeholder}} substitution)
- [x] Create all 35 HTML + plain-text email templates
- [x] Build server/emailService.ts (SES client, retry logic, logging, List-Unsubscribe header)
- [x] Build SNS webhook handler POST /webhooks/aws-ses (signature verification, status updates, complaint suppression)
- [x] Build email preferences tRPC router (get, update, unsubscribeAll)
- [x] Build EmailPreferences frontend page at /email-preferences
- [x] Wire email triggers into employer router (job post, application notification, credits, auto-repost)
- [x] Wire email triggers into school router (request autoreply, approved/rejected, placement events)
- [x] Wire email triggers into admin router (new school request, new drop, daily summary)
- [x] Wire email triggers into waitlist router (confirmation email)
- [x] Add daily admin summary cron job
- [x] Write Vitest tests for emailService and email preferences router (289 total passing)
- [x] Write AWS SES setup guide and .env.example additions

## Three New Features (June 2026)
- [x] Email Logs admin page: searchable table, status filter, date range, template filter, resend action
- [x] In-app notification bell: inAppNotifications DB table, tRPC router (list/markRead/markAllRead/unreadCount), NotificationBell component in nav, wire triggers
- [x] Email template preview in admin panel: template selector, sample data, live HTML preview, plain-text toggle
- [x] Vitest tests for email logs, email preview, and notifications procedures — 310 total passing across 10 test files
- [x] Date range filters (from/to date pickers + clear button) added to Email Logs admin page
- [x] Sample data passed through to email preview render procedure so templates render with populated values

## Three Feature Enhancements (June 2026 — Session 2)
- [x] Resend button on Email Logs admin page: admin.emailLogs.resend tRPC mutation, re-sends via emailService, updates log status, button per row with loading/success/error states
- [x] Real-time notification bell: refetchInterval reduced to 30 s with refetchIntervalInBackground: true so badge updates without page refresh
- [x] Send Test Email button on Email Template Preview: admin.emailPreview.sendTest tRPC mutation, sends rendered template to admin's own email address, toast feedback
- [x] Vitest tests for resend (4 tests) and sendTest (4 tests) — 318 total passing across 10 test files
- [x] templateData column added to emailLogs schema (ALTER TABLE applied to DB); emailService now persists JSON-serialised template data on every send
- [x] Resend procedure updated to use stored templateData for exact replay; BAD_REQUEST guard added for non-retryable statuses (sent/delivered/complaint)
- [x] Resend button in UI now only renders for failed/bounced rows; shows — dash for all other statuses
- [x] BAD_REQUEST guard covered by new Vitest test — 319 total passing across 10 test files

## Comprehensive Analytics Dashboards (June 2026 — Session 3)

### Part 1: DB Schema & Privacy
- [x] users table: add shareContactWithEmployers (boolean, default false), yearLevel (varchar), postcode (varchar)
- [x] jobApplications table: add contactSharedAtApplication (boolean) — snapshot of opt-in at time of apply
- [x] drops table: add sponsorshipFee (int, cents) and impressions (int, default 0) columns
- [x] New dropViews table: id, dropId, userId, viewedAt, ipAddress
- [x] Migration 0003 generated and applied to database

### Part 2: Hirer Analytics Backend
- [x] db.ts: getJobAnalyticsDetail(jobId, employerUserId) — views, applies, hires (from placements), conversionRate, avgSkillCount, timeToFirstApplication, applicant list (with privacy), schoolBreakdown, applicationsOverTime
- [x] employer.ts router: jobs.analyticsDetail procedure (protected, employer-only, own jobs only)
- [x] employer.ts router: jobs.applyForJob procedure — records contactSharedAtApplication snapshot
- [x] employer.ts router: privacy.update procedure — shareContactWithEmployers, yearLevel, postcode

### Part 3: Drop Business Analytics Backend
- [x] db.ts: recordDropView(dropId, userId?, ipAddress?) — inserts into dropViews, increments drops.impressions
- [x] db.ts: getDropAnalyticsDetail(dropId, businessUserId) — impressions, claims, claimRate, costPerImpression, costPerClaim, bySchool, byYearLevel, byPostcode, claimsOverTime
- [x] businessRouter created: drops.list, drops.create, drops.recordView, drops.analytics, drops.analyticsSummary
- [x] businessRouter registered in main routers.ts as trpc.business.*

### Part 4: Privacy Consent Frontend
- [x] PrivacySettings page: shareContactWithEmployers toggle, yearLevel selector, postcode input
- [x] Privacy Settings link added to Navbar user dropdown
- [x] Route registered in App.tsx

### Part 5: Hirer Analytics Frontend
- [x] EmployerDashboard: JobAnalyticsTable replaced with enhanced version showing hired count and conversion rate
- [x] Clickable row expands detail panel: KPI cards, applicant table (contact-share indicator), school breakdown bar chart, applications-over-time line chart
- [x] Charts built with inline SVG + Tailwind (no external charting library needed)

### Part 6: Drop Business Analytics Frontend
- [x] BusinessDashboard page: summary table with impressions/claims/claim-rate/cost-per-claim
- [x] Expandable detail panel: KPI cards, claims-over-time line chart, by-school bar chart, by-year-level bar chart, by-postcode inline bar
- [x] Drop Analytics link added to Navbar user dropdown; route registered in App.tsx

### Part 7: Tests & Delivery
- [x] analytics.test.ts: 11 tests covering analyticsDetail (3), applyForJob (3), privacy.update (2), business.drops.analytics (3)
- [x] 330 total tests passing across 11 test files — zero TypeScript errors
- [x] Checkpoint saved and pushed to GitHub

## Preview Profile Feature (June 2026 — Session 4)
- [ ] Backend: employer.profile.previewStudentProfile tRPC procedure — returns employer-view of the calling student's data (name, school, year level, skills/credentials, vouches, applications, privacy settings)
- [ ] Frontend: PreviewProfile modal on PrivacySettings page — shows exactly what employers see, with clear "visible / hidden" indicators per field based on current privacy settings
- [ ] Vitest tests for previewStudentProfile procedure

## Preview Profile Feature (June 2026)
- [x] employer.privacy.previewProfile tRPC procedure — returns employer-view of student's own profile, respecting shareContactWithEmployers flag
- [x] EmployerProfilePreview modal component — Dialog with Identity, Credentials, Vouches, Report Cards, Application History sections; visibility badges on each field
- [x] Preview Profile button added to Privacy Settings page header
- [x] Vitest tests: 4 tests (contact visible, contact hidden, NOT_FOUND, UNAUTHORIZED) — 334 total passing across 11 test files

## Preview Modal Enhancements (June 2026)
- [x] Live contact-sharing toggle inside the preview modal — Switch component wired to employer.privacy.update mutation; invalidates previewProfile query on success so the preview re-renders instantly without closing the modal
- [x] Explanatory tooltips on every Hidden badge — VisibilityBadge now accepts a `reason` prop; each hidden field carries a specific plain-English explanation of why it is not visible (name hidden: contact sharing off; email hidden: contact sharing off; yearLevel not provided; postcode not provided)
- [x] HelpCircle icon added to hidden badges to signal that a tooltip is available
- [x] Amber callout updated to reference the in-modal toggle instead of the settings page
- [x] Vitest tests: 3 new tests (toggle on, toggle off, UNAUTHORIZED) — 337 total passing across 11 test files

## AWS Deployment Optimisation (June 2026 — Session 5)

### Security
- [x] SQL injection in sesWebhook.ts suppressEmail() — replace raw string interpolation with parameterised Drizzle query
- [x] CORS not configured — all origins accepted in production; add cors middleware with ALLOWED_ORIGINS env var
- [x] No rate limiting on any endpoint — add express-rate-limit on /api/trpc and /webhooks
- [x] ENCRYPTION_KEY not validated in env.ts startup check
- [x] Missing helmet HTTP security headers

### Database
- [x] DB connection uses plain string URL — add SSL: true and connection pool settings for RDS
- [x] getDb() silently returns null — add assertDb() helper to fail fast instead of silent null-checks

### Server / Reliability
- [x] No structured logging — replace bare console.log/warn with structured JSON logger (pino)
- [x] No graceful shutdown handler (SIGTERM/SIGINT) — ECS tasks will be force-killed mid-request
- [x] Body-size limit not set — large payloads can crash the server
- [x] autoRepost cron uses [MOCK EMAIL] console.log instead of real emailService calls

### Build / Performance
- [x] Vite build has no code-splitting config — add manualChunks for vendor/react/trpc bundles
- [x] No gzip/brotli compression middleware on Express server

## Alumni Email Transition & Badge System (June 2026 — Session 6)

### Schema
- [x] Add `graduationDate` (date, nullable) to `users` table
- [x] Add `personalEmail` (varchar 255, nullable) to `users` table
- [x] Add `alumniEmailToken` (varchar 255, nullable) to `users` table
- [x] Add `alumniEmailTokenExpiry` (datetime, nullable) to `users` table
- [x] Add `alumniEmailVerified` (boolean, default false) to `users` table
- [x] Add `showAlumniBadge` (boolean, default true) to `users` table
- [x] Add `verifierName` (varchar 255, nullable) to `credentials` table
- [x] Add `verifierRole` (varchar 255, nullable) to `credentials` table
- [x] Add `verificationDate` (date, nullable) to `credentials` table
- [x] Add `evidenceUrl` (varchar 1024, nullable) to `credentials` table
- [x] Run `pnpm db:push` to apply migrations

### Email Templates
- [x] `alumni_email_verify` — verify personal email before transition
- [x] `alumni_email_confirmed` — confirmation after successful verification
- [x] `pre_graduation_reminder` — weekly reminder (3mo, 1mo, 1wk before graduation)
- [x] `school_contact_update` — notify school contact of email change

### Server / API
- [x] `GET /api/verify-alumni-email?token=...` Express endpoint (validates token, redirects to /verify-email/success or /verify-email/expired)
- [x] `alumni.requestEmailVerify` — send verify link to personal email (blocks school domains, blocks re-verify of same address)
- [x] `alumni.status` — return personalEmail, alumniEmailVerified, showAlumniBadge, graduationDate
- [x] `alumni.updateSettings` — update showAlumniBadge and/or graduationDate
- [x] `alumni.badgeCounts` — return real credential + vouch + alumni badge counts
- [x] `alumni.myKit` — return credentials and vouches for badge modal
- [x] `school.auth.updateContact` — update careersContactName + careersContactEmail (sends confirmation email)
- [x] DB helpers: `requestAlumniEmailChange`, `verifyAlumniEmail`, `getAlumniStatus`, `updateAlumniSettings`, `getBadgeCounts`, `getStudentCredentials`, `getStudentVouches`, `updateSchoolContact`

### Cron / Heartbeat
- [x] Pre-graduation reminder heartbeat job (weekly Mon 01:00 UTC, checks graduation dates within 3mo/1mo/1wk windows)
- [x] Heartbeat job registered in server/_core/index.ts (task_uid: jHV7fX2mfpoMqL8AmN9T9y)

### Frontend
- [x] PrivacySettings: alumni email section (input, send verify link, status indicator, show/hide badge toggle)
- [x] PrivacySettings: graduation date picker
- [x] BadgeModal component: shows credentials, vouches, alumni badge (always shown to student)
- [x] Dashboard profile card: real badge count (credentials + vouches + alumni badge if verified), clickable to open BadgeModal
- [x] `/verify-email/success` and `/verify-email/expired` result pages (handled by Express redirect)

### Tests
- [x] 14 Vitest tests for alumni router (status, requestEmailVerify, badgeCounts, updateSettings, myKit)
- [x] 351 total tests passing across 12 test files — zero TypeScript errors

## Vouches Real Data Wiring (June 2026 — Session 7)

### Schema
- [x] Add `voucherEmail` (varchar 255, nullable) to `vouches` table
- [x] Add `skillName` (varchar 255, nullable) to `vouches` table
- [x] Add `vouchToken` (varchar 255, nullable) to `vouches` table
- [x] Add `vouchTokenExpiry` (datetime, nullable) to `vouches` table
- [x] Applied migration via SQL (drizzle-kit connectivity workaround)

### DB Helpers
- [x] `addVouch` — insert new vouch row with token and expiry
- [x] `verifyVouchToken` — mark vouch as verified, clear token
- [x] `declineVouchToken` — mark vouch as rejected, clear token
- [x] `deleteVouch` — hard-delete a pending vouch (owner-only)
- [x] `getStudentVouches` updated to include voucherEmail, skillName, status fields

### Server / API
- [x] `vouches.list` query — return all vouches for logged-in user
- [x] `vouches.request` mutation — create vouch row, send verification_request email with verify/decline links
- [x] `vouches.delete` mutation — cancel a pending vouch (owner-only, not verified)
- [x] `GET /api/verify-vouch?token=...` Express endpoint — mark vouch verified, redirect to /my-kit?vouch=verified
- [x] `GET /api/decline-vouch?token=...` Express endpoint — mark vouch declined, redirect to /my-kit?vouch=declined
- [x] `vouches` router registered in routers.ts

### Frontend (MyKit)
- [x] MyKit.tsx Vouches section rewritten with real tRPC data
- [x] Real-time vouch list (pending / verified / declined status badges)
- [x] Request Vouch modal (name, email, title, org, skill — sends email via backend)
- [x] Cancel pending vouch button
- [x] URL-based result toast (?vouch=verified/declined/expired/invalid) on redirect back from supervisor link
- [x] Loading skeleton while fetching vouches
- [x] Empty state when no vouches exist

### Tests
- [x] 10 Vitest tests for vouches router (list, request, delete)
- [x] 361 total tests passing across 13 test files — zero TypeScript errors

## UI/UX Assessment Fixes (June 2026)

### Critical (P1)
- [x] 1.1 Replace state-based routing with URL-based routing (Wouter) so back button and deep links work
- [x] 1.2 Replace footer alert() dialogs with in-app placeholder pages for Privacy, Terms, Contact
- [x] 1.3 Add clear "coming soon" indicators on Jobs Board and The Drop (no back-end wiring yet)
- [x] 1.4 Replace developer-facing toast messages with user-appropriate copy throughout Dashboard
- [x] 1.5 Add "Coming soon" label to Squad cards so users know the feature is not yet live

### High (P2)
- [x] 2.1 Add last name field to waitlist form
- [x] 2.2 Add required asterisk to email field in waitlist form
- [ ] 2.3 Migrate LandingPage inline styles to Tailwind/CSS variables so dark mode applies (deferred — large refactor, risk of breaking deployed page)
- [x] 2.4 Add Open Graph and Twitter Card meta tags to index.html (already present)
- [x] 2.5 Fix "Why JutJut" section — ensure all 4 cards render on desktop viewport
- [ ] 2.6 Add skeleton loading states to My Kit, Jobs Board, The Drop pages (deferred — pages use local context data, no async loading)
- [x] 2.7 Update pricing CTAs to pre-select Employer role and reference chosen plan
- [x] 2.8 Add social media links to footer

### Medium (P3)
- [x] 3.1 Accessibility demo panel confirmed rendering correctly (code was already correct)
- [x] 3.2 Fix feature card grid — changed to auto-fill minmax(220px) to prevent overflow
- [x] 3.3 Add tooltip/description to Squads section explaining what Squads are
- [x] 3.4 Replace developer-facing post composer toast with user-appropriate message
- [x] 3.5 Update document.title on each page navigation
- [x] 3.6 Increase size and contrast of case studies disclaimer text
- [x] 3.7 Add "Skip to main content" accessibility link at top of page
- [x] 3.8 FontAwesome icons use empty <i></i> elements which are presentational by default; skip-to-content and semantic structure added

### Low (P4)
- [x] 4.1 Add ABN / company info to footer
- [x] 4.2 Waitlist already sends confirmation email via emailService; success state in form confirms this to user
- [x] 4.3 Differentiate pricing CTA labels (Sign up free / Start free trial / Contact sales)
- [ ] 4.4 Add keyboard shortcut hints for power users in Dashboard (deferred — low priority, no keyboard shortcuts implemented yet)
- [x] 4.5 Add IntersectionObserver active scroll state to landing page nav
- [x] 4.6 Dark-mode favicon support already in index.html (favicon.svg + favicon-dark.svg with media queries)

## Full Review Fixes (July 2026)

### P1 — Critical
- [x] R1.1 Fix LandingPage mobile grid — remove inline gridTemplateColumns from all 4 two-column sections
- [x] R1.2 Wire Job Board to real DB data (employer-posted jobs visible to students)
- [x] R1.3 Add role-based post-login routing (employers → Employer Dashboard, schools → School Portal)

### P2 — High
- [x] R2.1 Wire The Drop submission to DB (AppContext only currently)
- [x] R2.2 Add mobile nav access to Privacy Settings and Email Preferences
- [x] R2.3 Conditionally show Drop Analytics in profile dropdown (business users only)
- [x] R2.4 Add horizontal scroll wrappers to tables in School Portal and University Portal (already present)

### P3 — Medium
- [x] R3.1 Build Teacher/Coach portal (pending vouches, vouch history)
- [x] R3.2 Persist Privacy Settings and Email Preferences toggles to DB
- [x] R3.3 Wire social feed posts to DB

### P4 — Low
- [x] R4.1 Add mobile animation to LandingPage mobile menu
- [x] R4.2 Replace native <select> in waitlist form with shadcn Select component (native select already using custom buttons)
- [x] R4.3 Add recommended-for-desktop notice to Admin Dashboard on mobile
