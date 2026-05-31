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
- [ ] Jobs board: search bar and category filters (role type, location, wage, timing)
- [ ] Landing page: interactive FAQ accordion section with common user questions
- [ ] Login screen: Forgot Password flow with clean UI for credential reset
