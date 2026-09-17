# JutJut UX and ROI Audit — September 2026

## Executive assessment

**JutJut has a differentiated and increasingly credible foundation.** Its strongest proposition is the combination of student-held evidence, employer-facing hiring outcomes, student perks, and institution-governed work-integrated learning. The product already makes several important boundaries explicit: a student’s contact-sharing preference is captured at application time, a Drop redemption is independently confirmed by staff, and an approved practical opportunity does not automatically qualify a student for course completion. These are meaningful trust advantages in the Australian student and WIL context.[1][2][3]

The principal usability and ROI risk was not the feature set; it was the distance between the public promise, the signed-in role, and the action that produces a measurable outcome. The improvements completed in this delivery reduce that distance for students, business clients, and institutions. The remaining work should concentrate on closing the employer hiring loop, capturing campaign requirements before review, and adding capacity and operational reporting to Practicals.

| Audience | Core value proposition | Current UX strength | Highest remaining ROI opportunity |
|---|---|---|---|
| **Students** | Turn verified evidence into jobs, perks and course-linked experience. | Real sign-in state, live jobs, live Drops, QR redemption feedback, and course-linked practicals guidance. | Show a concise personal outcome summary: Kit progress, applications, interviews/hiring status, Drop redemptions and practicals progress. |
| **Businesses** | Recruit verified talent, create student offers, and host course-linked work. | Role-aware navigation, credit-aligned pricing, campaign analytics, and confirmed redemption metrics. | Add shortlist/decline/hired controls and structured Drop campaign requirements to make the commercial result trackable end to end. |
| **Institutions** | Govern course-required real-world learning without surrendering academic authority. | Course pathways, evidence-led decision dialogs, separate concern triage, and final completion control. | Enforce capacity and introduce a small operational scorecard for review turnaround, fill rate, completion and concern resolution. |

## Improvements completed in this delivery

### A single, reliable authentication journey

The app shell now takes its authenticated state from the OAuth-backed session used by protected data procedures, rather than from the former prototype-only client state. When an unauthenticated visitor chooses a protected destination, such as Practicals, JutJut stores that destination in session storage, sends the visitor to sign-in, and restores the destination after successful authentication. This removes a confusing situation in which the interface appeared signed in while product data correctly required an OAuth session.[1]

### Role-aware navigation and workspace orientation

The primary navigation now adapts to the user’s operational role. Students retain a focused student navigation; business users are directed to Business Hub, The Drop campaigns and host-practical work; and recognised institution users are directed to the Institution Workspace. Internal brand assets, teaching tools and administration controls are no longer presented as student actions. Practicals also defaults to the institution or business workspace when a recognised provider opens it, while preserving the ability to inspect the other participant views.[1][4]

### Trustworthy jobs and student applications

The Job Board now uses live employer-posted inventory only. It distinguishes loading, failed loading and genuinely empty inventory rather than substituting prototype listings. Opening an application records a job view; confirming an application calls the durable application procedure and shows the actual available Kit profile—rather than fixed example credentials—before the student submits. A successful application receives a clear completion state, while duplicate and server errors are presented as recoverable messages.[1][5]

### A student-only, live-data Drop experience

The Drop no longer combines a student perk surface with an editable business partner area. It lists only live database-backed offers, identifies whether the signed-in student has already claimed or redeemed an offer, respects claim capacity, provides a truthful empty/error state, and opens the existing time-limited QR redemption flow. This makes the student experience clearer and prevents an offer from being presented as claimable when it is not.[1][2]

### Clearer business acquisition and measurable campaign outcomes

Public pricing now accurately represents the established job-credit model: employers can explore for free, purchase a single $15 job credit, or purchase a five-job $50 credit pack. Launch-gated hiring calls now explicitly say **Join employer waitlist** and preselect the employer context. In the business dashboard, campaign reporting now differentiates a student **claim** from a staff-confirmed **redemption**. Businesses can review redeemed offers, claim-to-redemption rate, cost per redemption, and trends for claims and redemptions, giving them a credible proxy for in-store outcome without requiring POS integration.[2][6]

### An institution-led decision and concern workspace

The new **Institution Workspace** is designed for accountable review rather than instant, generic decisions. Coordinators can create and publish course pathways, then work through opportunity, student-match and student-sourced proposal queues. Each review opens a structured dialog containing the submitted scope, supervisor, deliverables, conditions, learning context and relevant student evidence. The interface requires a coordinator-authored rationale before a consequential decision and supports conditions on opportunity approval.

The workspace also introduces an institution-owned concern queue. Safety, wellbeing, conduct and scope-change concerns are surfaced with their student, opportunity, pathway, date and current status. A coordinator can take ownership, record triage notes, and resolve a concern with a recorded resolution. Resolved concerns become read-only in the interface to protect the historic record. Completion review now exposes the student reflection and supervisor feedback before the coordinator records the final course outcome. This preserves the institution’s final authority and makes review activity more defensible.[3][7]

## Recommended next priorities

### 1. Complete the employer hiring outcome loop

JutJut already records applications and exposes applicant analytics, but employers still require the ordinary controls to shortlist, decline, contact and record a hire. This is the highest remaining commercial priority because it converts employer interest into a measurable hiring outcome. The implementation should add status actions to existing applications, preserve consent snapshots, notify the student of an outcome, and derive the “hired” metric from that documented action rather than from an unverified proxy.[5]

### 2. Improve Drop campaign submission quality

The business submission form should collect the structured information already implied by the sales proposition: intended student audience, location or school preference, redemption instructions, offer terms and commercial constraints. This will reduce manual clarification, improve campaign review quality and produce meaningful segmentation for later reporting. It should not imply point-of-sale integration where none exists.[2]

### 3. Make Practicals capacity and coordination operational

Course pathways and opportunities already record required hours, dates and maximum participants, but approval currently does not prevent over-allocation. Before an institution approves an individual match, JutJut should display submitted and approved applications, remaining capacity and relevant pathway dates; it should block an approval that exceeds the defined capacity. For cohort briefs, the capacity label should precisely reflect whether it is for students or teams.[3]

### 4. Add a small, evidence-led ROI scorecard

The correct first reporting surface is not a complex analytics suite. A practical institution scorecard can use existing timestamps and lifecycle states to report review turnaround, time from application to match, commencement rate, completion rate, unresolved concern age, and capacity utilisation once capacity checks exist. A business scorecard should show employer lead-to-activation, first listing/campaign/practical submission, job view-to-application, application-to-hire, and Drop impression-to-claim-to-redemption. Students should see their own Kit progress and outcomes without being overwhelmed by operational metrics.[2][3][5]

### 5. Apply accessibility settings to high-friction work

Quiet Mode is a useful foundation, but the public promise of plain language and stepped forms should be realised first in the job application confirmation, vouch request, practical application and host opportunity forms. Controls should use semantic switches or checkboxes where appropriate, preserve visible focus treatment, and avoid describing a demonstration setting as product-wide behaviour until it has been implemented across the relevant journeys.[1]

## Verification

The final implementation passed TypeScript validation with `npx tsc --noEmit`. The full Vitest suite passed **16 test files and 390 tests**, including the practicals workflow test that verifies an institution-scoped concern update. The public preview was reviewed after the updated pricing and employer actions were rendered. The only non-blocking test environment warning remains the existing local `JWT_SECRET` length warning.

## References

[1]: file:///home/ubuntu/stepone-prototype/client/src/App.tsx "JutJut application shell, role-aware navigation and authenticated routing"
[2]: file:///home/ubuntu/stepone-prototype/client/src/pages/BusinessDashboard.tsx "JutJut business campaign performance interface"
[3]: file:///home/ubuntu/stepone-prototype/client/src/pages/InstitutionWorkspace.tsx "JutJut institution review and concern-triage interface"
[4]: file:///home/ubuntu/stepone-prototype/client/src/pages/PracticalsHub.tsx "JutJut Practicals multi-party workspace selector"
[5]: file:///home/ubuntu/stepone-prototype/server/routers/employer.ts "JutJut job application, view tracking and privacy contract"
[6]: file:///home/ubuntu/stepone-prototype/server/routers/business.ts "JutJut Drop campaign summary and redemption analytics"
[7]: file:///home/ubuntu/stepone-prototype/server/routers/practicals.ts "JutJut institution-scoped practical review and concern procedures"
