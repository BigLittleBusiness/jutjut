# StepOne Prototype — TODO

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
