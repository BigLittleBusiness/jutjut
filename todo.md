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
- [ ] Add email_logs and email_preferences tables to DB schema and push migration
- [ ] Install @aws-sdk/client-ses package
- [ ] Build renderEmail template engine (HTML + plain-text, {{placeholder}} substitution)
- [ ] Create all 35 HTML + plain-text email templates
- [ ] Build server/emailService.ts (SES client, retry logic, logging, List-Unsubscribe header)
- [ ] Build SNS webhook handler POST /webhooks/aws-ses (signature verification, status updates, complaint suppression)
- [ ] Build email preferences tRPC router (get, update, unsubscribeAll)
- [ ] Build EmailPreferences frontend page at /email-preferences
- [ ] Wire email triggers into employer router (job post, application notification, credits, auto-repost)
- [ ] Wire email triggers into school router (request autoreply, approved/rejected, placement events)
- [ ] Wire email triggers into admin router (new school request, new drop, daily summary)
- [ ] Wire email triggers into waitlist router (confirmation email)
- [ ] Add daily admin summary cron job
- [ ] Write Vitest tests for emailService and email preferences router
- [ ] Write AWS SES setup guide and .env.example additions
