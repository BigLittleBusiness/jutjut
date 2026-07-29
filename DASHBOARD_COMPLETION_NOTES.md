# Dashboard Completion Notes — Employer & Business

## Current State Summary (as of 2026-07-29)

### Authentication / Login
- Login.tsx: email/password sign-in + sign-up UI exists but uses a FAKE `login(email)` from AppContext (just sets localStorage). NOT wired to real auth.
- Real auth is Manus OAuth via /api/oauth/callback. The `useAuth()` hook reads from the real session cookie.
- The Login page shows "Student View" in the corner tag — no employer/business account type selection.
- Sign-up form validates for student email patterns (.edu, school, college, uni) — blocks employer emails.
- Forgot password / reset flows are demo only (no backend).

### Employer Dashboard (EmployerDashboard.tsx)
WORKING:
- Credit balance display (real DB via trpc.employer.credits.balance)
- Buy Credits modal: PinPayments token input OR Stripe Elements (gateway-aware, added today)
- Post Job modal: full form, deducts credit, saves to DB
- Job analytics table: views, applications, expandable detail with charts + applicant list
- Transaction history (real DB)
- Auto-repost toggle per job

MISSING:
- No employer onboarding/profile setup screen (businessName, ABN, contactEmail, industry, postcode)
  - Backend: trpc.employer.profile.upsert exists
  - Frontend: no UI at all — employer lands on dashboard with no way to set up profile
- No "first-time" detection — if employer has no profile record, dashboard should show onboarding
- No applicant management screen (view full applicant kit, mark as reviewed, contact)
  - Backend: applicant data exists in job analytics query
  - Frontend: applicant table is read-only, no actions
- PinPayments Hosted Fields not integrated (raw token input is placeholder)
- No employer account settings page (edit businessName, ABN, GST status, contact details)

### Business Dashboard (BusinessDashboard.tsx)
WORKING:
- Drop analytics summary table (real DB via trpc.business.drops.analyticsSummary)
- Drop analytics detail panel with KPI cards, charts, breakdowns (real DB)

MISSING:
- No Drop submission form for businesses (the submit procedure exists in backend but no UI in BusinessDashboard)
  - Backend: trpc.business.drops.submit exists (title, description, maxClaims)
  - Frontend: empty state says "Contact JutJut to schedule your first Drop" — no self-service form
- No Drop management screen (edit draft drops, view status, see when admin approves)
- No business profile / account settings (businessName, logo, contact details)
- No Drop payment flow (sponsorshipFee is set by admin, but business has no way to pay)
- isBusiness === isEmployer in useUserRole (same user type) — no separate business identity

### Role-Based Identity Gap
- users.role is only "user" | "admin" — no "employer" or "business" role
- Employer identity is detected by presence of employers table record
- Business identity is currently the same as employer (isBusiness === isEmployer)
- Login page has no account type selector — all new signups are treated as students
- No employer/business registration flow that creates the employers record

### Post-Login Routing (App.tsx handleLoginSuccess)
- Uses useUserRole().defaultPage
- Employers → "employer" page ✓
- Schools → "school-portal" ✓
- Admins → "admin-dashboard" ✓
- Students → "dashboard" ✓
- Business users → same as employer (goes to "employer") — no separate routing to "business-dashboard"

## Priority Build Plan

### P1 — Employer Onboarding (blocks all employer usage)
1. Add EmployerOnboarding.tsx page: businessName, ABN, contactEmail, industry, postcode, GST toggle
2. In EmployerDashboard: detect if employer profile is null → show onboarding first
3. Wire to trpc.employer.profile.upsert

### P2 — Employer Account Settings
1. Add "Account Settings" tab/section to EmployerDashboard
2. Allow editing businessName, ABN, contactEmail, industry, postcode, GST status
3. Wire to trpc.employer.profile.upsert (same mutation, idempotent)

### P3 — Business Drop Submission UI
1. Add "Submit a Drop" button + modal to BusinessDashboard
2. Form: offer title, description, image upload, max claims, preferred date
3. Wire to trpc.business.drops.submit
4. Show submitted drops in a "Pending Approval" section

### P4 — Login Page: Account Type Selection
1. Add account type selector to sign-up view: Student / Employer / Business
2. For employer/business: redirect to employer onboarding after first login
3. Remove student-email-only validation for employer/business signups

### P5 — Employer Applicant Actions
1. Add "Mark as Reviewed" and "Contact" actions to applicant rows
2. Backend: add trpc.employer.jobs.markApplicantReviewed mutation

### P6 — Business Profile / Account Settings
1. Add business profile section to BusinessDashboard
2. Fields: businessName, logo upload, contactEmail, website, description
3. Separate from employer profile (businesses may not post jobs)
